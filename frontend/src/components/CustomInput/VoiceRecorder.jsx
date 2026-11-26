import { useFormikContext } from "formik";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  IconButton,
  Flex,
} from "@chakra-ui/react";

function VoiceRecorder({ name, value, disabled = false }) {
  const { setFieldValue } = useFormikContext();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [hasMicPermission, setHasMicPermission] = useState(null); // null = unknown, true = granted, false = denied
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Check microphone permission status on mount (without requesting)
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({
            name: "microphone",
          });
          // Only set to true if granted, otherwise leave as null (unknown/prompt)
          if (result.state === "granted") {
            setHasMicPermission(true);
          } else if (result.state === "denied") {
            setHasMicPermission(false);
          } else {
            // "prompt" state - permission not yet requested
            setHasMicPermission(null);
          }

          // Listen for permission changes
          result.onchange = () => {
            if (result.state === "granted") {
              setHasMicPermission(true);
            } else if (result.state === "denied") {
              setHasMicPermission(false);
            } else {
              setHasMicPermission(null);
            }
          };
        } else {
          // Permissions API not supported - assume unknown state
          // Don't try to access microphone here as it would trigger a prompt
          setHasMicPermission(null);
        }
      } catch (error) {
        console.error("Error checking microphone permission:", error);
        // If we can't check, assume unknown state
        setHasMicPermission(null);
      }
    };

    checkMicPermission();
  }, []);

  // Initialize audio URL from existing value
  useEffect(() => {
    if (value) {
      if (typeof value === "string") {
        // It's a URL string
        setAudioUrl(value);
      } else if (value instanceof File || value instanceof Blob) {
        // It's a file/blob
        const url = URL.createObjectURL(value);
        setAudioUrl(url);
        setAudioBlob(value);
      }
    } else {
      setAudioUrl(null);
      setAudioBlob(null);
    }
  }, [value]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }
      // Cleanup stream if recording is in progress
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Create a File object from the blob
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setFieldValue(name, file);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setHasMicPermission(false);
      alert("Error accessing microphone. Please check your permissions.");
    }
  }, [name, setFieldValue, disabled]);

  const stopRecording = useCallback(() => {
    if (disabled) return;
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording, disabled]);

  const discardRecording = useCallback(() => {
    if (disabled) return;
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      // Clear chunks without creating a file
      chunksRef.current = [];
      setRecordingTime(0);
    }
  }, [isRecording, disabled]);

  const requestMicPermission = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted");
      setHasMicPermission(true);

      // Stop tracks if you only needed permission
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.error("Microphone access denied:", err);
      setHasMicPermission(false);

      // Only show alert if permission was explicitly denied (not just dismissed)
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        alert(
          "Microphone access denied. Please enable microphone permissions in your browser settings."
        );
      }
      // If it's a NotReadableError or other error, the user might have dismissed the prompt
      // Don't show an alert in that case
    }
  }, [disabled]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const handleDelete = useCallback(() => {
    if (disabled) return;
    if (audioUrl && audioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setFieldValue(name, null);
    setRecordingTime(0);
  }, [audioUrl, name, setFieldValue, disabled]);

  return (
    <VStack spacing={3} align="stretch" w="100%" opacity={disabled ? 0.65 : 1}>
      {hasMicPermission !== true && !audioUrl && !isRecording ? (
        <Button
          onClick={requestMicPermission}
          colorPalette="brand"
          size={{ base: "sm", md: "md" }}
          leftElement={<i className="fa fa-microphone" />}
          w="fit-content"
          disabled={disabled}
        >
          Enable Microphone
        </Button>
      ) : !audioUrl && !isRecording ? (
        <Button
          onClick={startRecording}
          colorPalette="brand"
          size={{ base: "sm", md: "md" }}
          leftElement={<i className="fa fa-microphone" />}
          w="fit-content"
          disabled={disabled}
        >
          Start Recording
        </Button>
      ) : isRecording ? (
        <VStack spacing={3} align="stretch" w="100%">
          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "stretch", md: "center" }}
            justify="center"
            gap={3}
            p={3}
            bg="red.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="red.200"
          >
            <HStack spacing={2} justify="center" flex={1}>
              <Box
                w="10px"
                h="10px"
                borderRadius="50%"
                bg="red.500"
                css={{
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                  },
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <Text
                fontSize={{ base: "sm", md: "md" }}
                fontWeight="medium"
                color="red.700"
              >
                {formatTime(recordingTime)}
              </Text>
            </HStack>
            <HStack spacing={2} w={{ base: "100%", md: "auto" }}>
              <Button
                onClick={discardRecording}
                colorPalette="red"
                variant="outline"
                size={{ base: "sm", md: "md" }}
                flex={{ base: 1, md: "none" }}
                leftElement={<i className="fa fa-times" />}
                disabled={disabled}
              >
                Discard
              </Button>
              <Button
                onClick={stopRecording}
                colorPalette="secondary"
                variant="subtle"
                size={{ base: "sm", md: "md" }}
                flex={{ base: 1, md: "none" }}
                leftElement={<i className="fa fa-check" />}
                disabled={disabled}
              >
                Save
              </Button>
            </HStack>
          </Flex>
        </VStack>
      ) : (
        <Box
          p={{ base: 3, md: 4 }}
          borderWidth="1px"
          borderRadius="md"
          bg="gray.50"
          w="100%"
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            gap={3}
          >
            <HStack spacing={3} flex={1}>
              <i
                className="fa fa-file-audio"
                style={{
                  fontSize: "20px",
                  color: "var(--chakra-colors-brand-500)",
                }}
              />
              <VStack align="start" spacing={0} flex={1}>
                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium">
                  Voice Recording
                </Text>
                {audioBlob && (
                  <Text fontSize="xs" color="gray.500">
                    {(audioBlob.size / 1024).toFixed(2)} KB
                  </Text>
                )}
              </VStack>
            </HStack>
            <Flex
              direction={{ base: "column", md: "row" }}
              align="stretch"
              gap={2}
              w={{ base: "100%", md: "auto" }}
              alignItems="center"
            >
              {audioUrl && (
                <Box flex={1} minW={{ base: "100%", md: "400px" }}>
                  <audio
                    controls
                    src={audioUrl}
                    style={{ width: "100%", maxWidth: "400px" }}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </Box>
              )}
              <IconButton
                size={{ base: "sm", md: "md" }}
                variant="ghost"
                colorPalette="red"
                onClick={handleDelete}
                aria-label="Delete recording"
                flexShrink={0}
                disabled={disabled}
              >
                <i className="fa fa-trash" />
              </IconButton>
            </Flex>
          </Flex>
        </Box>
      )}
    </VStack>
  );
}

export default VoiceRecorder;
