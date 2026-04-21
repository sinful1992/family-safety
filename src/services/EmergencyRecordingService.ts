// PLACEHOLDER: This service defines the full API for emergency video recording.
// All methods are no-ops until the recording feature is enabled.
// When enabled, start() will launch a native foreground service that records
// camera + microphone and uploads chunks to Firebase Storage, and family members
// will receive a viewer link via the existing notification channel.

const EmergencyRecordingService = {
  // PLACEHOLDER
  async start(_userId: string, _groupId: string): Promise<void> {
    console.log('[EmergencyRecordingService] PLACEHOLDER: recording not yet implemented');
  },

  // PLACEHOLDER
  async stop(): Promise<void> {
    console.log('[EmergencyRecordingService] PLACEHOLDER: stop called');
  },

  // PLACEHOLDER
  isRecording(): boolean {
    return false;
  },
};

export default EmergencyRecordingService;
