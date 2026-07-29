'use client';

import React, { useRef, useEffect } from 'react';
import { useCall } from '@/contexts/CallContext';
import { Phone, Video, X, Mic, MicOff, Camera, CameraOff, PhoneOff } from 'lucide-react';

export default function CallModal() {
  const { callStatus, callType, callerName, callerAvatar, answerCall, endCall, rejectCall, localStream, remoteStream, isMuted, isVideoOff, toggleMute, toggleVideo } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => console.error('Error playing local video:', err));
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => console.error('Error playing remote video:', err));
    }
  }, [remoteStream]);

  if (callStatus === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-card rounded-2xl shadow-modal w-full max-w-md mx-4 overflow-hidden">
        {/* Calling / Incoming Screen */}
        {(callStatus === 'calling' || callStatus === 'incoming') && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            {/* Avatar */}
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full gradient-green flex items-center justify-center text-white text-4xl font-bold">
                {callerAvatar ? (
                  <img
                    src={callerAvatar || undefined}
                    alt={callerName || 'User'}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  callerName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              {callType === 'video' && (
                <div className="absolute bottom-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Video size={16} className="text-white" />
                </div>
              )}
            </div>

            {/* Name and status */}
            <h2 className="text-2xl font-bold text-foreground mb-2">{callerName}</h2>
            <p className="text-muted-foreground mb-8">
              {callStatus === 'calling' ? 'Calling...' : 'Incoming call...'}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-6">
              {callStatus === 'incoming' ? (
                <>
                  <button
                    onClick={rejectCall}
                    className="w-16 h-16 rounded-full bg-negative text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                  >
                    <PhoneOff size={24} />
                  </button>
                  <button
                    onClick={answerCall}
                    className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                  >
                    <Phone size={24} />
                  </button>
                </>
              ) : (
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-negative text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  <PhoneOff size={24} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Connected Screen */}
        {callStatus === 'connected' && (
          <div className="flex flex-col h-[500px]">
            {/* Video area */}
            <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
              {callType === 'video' ? (
                <>
                  {/* Remote video */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Local video (small) */}
                  <div className="absolute bottom-4 right-4 w-24 h-32 bg-gray-700 rounded-lg overflow-hidden border-2 border-white/20">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Phone size={48} className="text-primary" />
                  </div>
                  <p className="text-white text-lg font-semibold">{callerName}</p>
                  <p className="text-gray-400 text-sm">Voice call in progress</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="bg-card p-4 flex items-center justify-center gap-4">
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-negative text-white' : 'bg-muted'}`}
              >
                {isMuted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-foreground" />}
              </button>
              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-negative text-white' : 'bg-muted'}`}
                >
                  {isVideoOff ? <CameraOff size={20} className="text-white" /> : <Camera size={20} className="text-foreground" />}
                </button>
              )}
              <button
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-negative text-white flex items-center justify-center hover:bg-red-700 transition-colors"
              >
                <PhoneOff size={24} />
              </button>
              <button className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <X size={20} className="text-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Ended Screen */}
        {callStatus === 'ended' && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <PhoneOff size={32} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Call Ended</h2>
            <p className="text-muted-foreground mb-6">The call has ended</p>
          </div>
        )}
      </div>
    </div>
  );
}
