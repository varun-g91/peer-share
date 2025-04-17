interface ProgressBarProps {
    progress: number;
    showLabel?: boolean;
    label?: string;
    className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
}) => {

    if (typeof progress !== "number") return null;

  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  console.log("Progress: ", clampedProgress)

  return (
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
      <div
        className="bg-blue-500 h-full transition-all duration-200"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
};
