'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWebRTC } from '@/hooks/useWebRTC';

export type CallType = 'voice' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface CallContextType {
  callStatus: CallStatus;
  callType: CallType | null;
  callerName: string | null;
  callerAvatar: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  initiateCall: (type: CallType, name: string, avatar?: string, userId?: string) => Promise<void>;
  answerCall: () => Promise<void>;
  endCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [callerName, setCallerName] = useState<string | null>(null);
  const [callerAvatar, setCallerAvatar] = useState<string | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [calleeId, setCalleeId] = useState<string | null>(null);

  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    createPeerConnection,
    getLocalStream,
    createOffer,
    createAnswer,
    addIceCandidate,
    toggleMute,
    toggleVideo,
    cleanup,
  } = useWebRTC();

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Listen for incoming calls via Supabase Realtime
  useEffect(() => {
    let channel: any;

    const setupIncomingCallListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'calls',
            filter: `callee_id=eq.${user.id}`,
          },
          async (payload) => {
            const call = payload.new;
            if (call.status === 'initiated' || call.status === 'ringing') {
              setCallType(call.call_type);
              setCurrentCallId(call.id);
              setCallerName('Incoming Call'); // You can fetch caller name from users table
              setCallStatus('incoming');
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'calls',
            filter: `callee_id=eq.${user.id}`,
          },
          async (payload) => {
            const call = payload.new;
            if (call.status === 'connected' && currentCallId === call.id) {
              setCallStatus('connected');
            } else if (call.status === 'ended' || call.status === 'rejected') {
              setCallStatus('ended');
              setTimeout(() => {
                setCallStatus('idle');
                setCallType(null);
                setCallerName(null);
                setCallerAvatar(null);
                setCurrentCallId(null);
                setCalleeId(null);
              }, 1000);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupIncomingCallListener();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, currentCallId]);

  // Listen for call status updates (for caller to know when callee answers)
  useEffect(() => {
    if (!currentCallId) return;

    const channel = supabase
      .channel(`call_status:${currentCallId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${currentCallId}`,
        },
        async (payload) => {
          const call = payload.new;
          if (call.status === 'connected' && callStatus === 'calling') {
            setCallStatus('connected');
          } else if (call.status === 'ended' || call.status === 'rejected') {
            setCallStatus('ended');
            setTimeout(() => {
              setCallStatus('idle');
              setCallType(null);
              setCallerName(null);
              setCallerAvatar(null);
              setCurrentCallId(null);
              setCalleeId(null);
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCallId, callStatus, supabase]);

  // Listen for call signals (offer, answer, ICE candidates)
  useEffect(() => {
    if (!currentCallId) return;

    const channel = supabase
      .channel(`call_signals:${currentCallId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `call_id=eq.${currentCallId}`,
        },
        async (payload) => {
          const signal = payload.new;
          const pc = peerConnectionRef.current;
          if (!pc) return;

          // Ignore signals sent by the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (signal.sender_id === user?.id) {
            console.log('Ignoring own signal');
            return;
          }

          if (signal.signal_type === 'offer') {
            console.log('Received offer from peer, current state:', pc.signalingState);
            // Only create answer if we're the callee (stable state)
            if (pc.signalingState === 'stable') {
              const answer = await createAnswer(pc, signal.signal_data);
              if (answer) {
                await sendSignal(currentCallId, 'answer', answer);
              }
            } else if (pc.signalingState === 'have-remote-offer') {
              // Already have an offer, ignore this one
              console.log('Already have remote offer, ignoring new offer');
            } else {
              console.log('Ignoring offer - wrong state:', pc.signalingState);
            }
          } else if (signal.signal_type === 'answer') {
            console.log('Received answer from peer, current state:', pc.signalingState);
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
            } else {
              console.log('Ignoring answer - wrong state:', pc.signalingState);
            }
          } else if (signal.signal_type === 'ice-candidate') {
            console.log('Received ICE candidate from peer');
            // Only add ICE candidate if connection is not closed
            if (pc.signalingState !== 'closed') {
              await addIceCandidate(pc, new RTCIceCandidate(signal.signal_data));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCallId, createAnswer, addIceCandidate, supabase]);

  const sendSignal = async (callId: string, signalType: string, signalData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('call_signals').insert({
      call_id: callId,
      sender_id: user.id,
      signal_type: signalType,
      signal_data: signalData,
    });

    return user.id;
  };

  const initiateCall = useCallback(async (type: CallType, name: string, avatar?: string, userId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userId) {
        console.error('User not authenticated or callee ID missing');
        return;
      }

      setCallType(type);
      setCallerName(name);
      setCallerAvatar(avatar || null);
      setCalleeId(userId);
      setCallStatus('calling');

      // Get local stream
      await getLocalStream(type === 'video', true);

      // Create call record
      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          callee_id: userId,
          call_type: type,
          status: 'ringing',
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCallId(call.id);

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Listen for ICE candidates before adding tracks
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await sendSignal(call.id, 'ice-candidate', event.candidate);
        }
      };

      // Add local tracks after getting stream
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      // Create and send offer
      const offer = await createOffer(pc);
      if (offer) {
        await sendSignal(call.id, 'offer', offer);
      }

    } catch (error) {
      console.error('Error initiating call:', error);
      setCallStatus('idle');
    }
  }, [supabase, getLocalStream, createPeerConnection, createOffer, localStream]);

  const answerCall = useCallback(async () => {
    try {
      if (!currentCallId) return;

      setCallStatus('connected');

      // Update call status
      await supabase
        .from('calls')
        .update({ status: 'connected' })
        .eq('id', currentCallId);

      // Get local stream
      const stream = await getLocalStream(callType === 'video', true);

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Listen for ICE candidates before adding tracks
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await sendSignal(currentCallId, 'ice-candidate', event.candidate);
        }
      };

      // Add local tracks after getting stream
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

    } catch (error) {
      console.error('Error answering call:', error);
    }
  }, [currentCallId, supabase, getLocalStream, createPeerConnection, callType]);

  const endCall = useCallback(async () => {
    try {
      if (currentCallId) {
        await supabase
          .from('calls')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', currentCallId);
      }

      cleanup();
      setCallStatus('ended');
      
      setTimeout(() => {
        setCallStatus('idle');
        setCallType(null);
        setCallerName(null);
        setCallerAvatar(null);
        setCurrentCallId(null);
        setCalleeId(null);
      }, 1000);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [currentCallId, supabase, cleanup]);

  const rejectCall = useCallback(async () => {
    try {
      if (currentCallId) {
        await supabase
          .from('calls')
          .update({ status: 'rejected' })
          .eq('id', currentCallId);
      }

      setCallStatus('ended');
      
      setTimeout(() => {
        setCallStatus('idle');
        setCallType(null);
        setCallerName(null);
        setCallerAvatar(null);
        setCurrentCallId(null);
        setCalleeId(null);
      }, 500);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }, [currentCallId, supabase]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callType,
        callerName,
        callerAvatar,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        initiateCall,
        answerCall,
        endCall,
        rejectCall,
        toggleMute,
        toggleVideo,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
