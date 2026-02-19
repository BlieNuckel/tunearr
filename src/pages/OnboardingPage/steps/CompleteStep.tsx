interface CompleteStepProps {
  saving: boolean;
  onFinish: () => void;
}

export default function CompleteStep({ saving, onFinish }: CompleteStepProps) {
  return (
    <div className="text-center py-4">
      <div className="text-4xl mb-4">&#10003;</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h3>
      <p className="text-gray-500 mb-8">
        Your integrations are configured. You can always change these later in
        Settings.
      </p>
      <button
        type="button"
        onClick={onFinish}
        disabled={saving}
        className="px-6 py-3 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-md hover:translate-y-[-1px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
      >
        {saving ? "Saving..." : "Go to App"}
      </button>
    </div>
  );
}
