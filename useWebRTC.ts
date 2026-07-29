'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface WebRTCConfig {
  iceServers?: RTCIceServer[];
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  createPeerConnection: () => RTCPeerConnection;
  getLocalStream: (video: boolean, audio: boolean) => Promise<void>;
  createOffer: (peerConnection: RTCPeerConnection) => Promise<RTCSessionDescription | null>;
  createAnswer: (peerConnection: RTCPeerConnection, offer: RTCSessionDescription) => Promise<RTCSessionDescription | null>;
  addIceCandidate: (peerConnection: RTCPeerConnection, candidate: RTCIceCandidate) => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  cleanup: () => void;
}

export function useWebRTC(config: WebRTCConfig = {}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const defaultIceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  const iceServers = config.iceServers || defaultIceServers;

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const getLocalStream = useCallback(async (video: boolean, audio: boolean) => {
    try {
      cleanup();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480 } : false,
        audio: audio,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Set initial mute/video states
      if (!audio) {
        stream.getAudioTracks().forEach(track => track.enabled = false);
        setIsMuted(true);
      }
      if (!video) {
        stream.getVideoTracks().forEach(track => track.enabled = false);
        setIsVideoOff(true);
      }

      return stream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }, [cleanup]);

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // This will be handled by the calling component
        console.log('ICE candidate:', event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams && event.streams.length > 0) {
        console.log('Setting remote stream');
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  const addLocalTracksToPeerConnection = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
  }, []);

  const createOffer = useCallback(async (pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit | null> => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      return null;
    }
  }, []);

  const createAnswer = useCallback(async (
    pc: RTCPeerConnection,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit | null> => {
    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      return null;
    }
  }, []);

  const addIceCandidate = useCallback(async (
    pc: RTCPeerConnection,
    candidate: RTCIceCandidate
  ): Promise<void> => {
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
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
  };
}
