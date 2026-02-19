interface WelcomeStepProps {
  onGetStarted: () => void;
}

export default function WelcomeStep({ onGetStarted }: WelcomeStepProps) {
  return (
    <div className="text-center py-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to Music Requester
      </h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Music Requester helps you discover and add music to your Lidarr library.
        Let's get your integrations set up so you can start requesting albums.
      </p>
      <button
        type="button"
        onClick={onGetStarted}
        className="px-6 py-3 bg-amber-300 hover:bg-amber-200 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-md hover:translate-y-[-1px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
      >
        Get Started
      </button>
    </div>
  );
}
