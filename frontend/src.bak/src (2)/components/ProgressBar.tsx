interface ProgressBarProps {
    progress: number;
    showLabel?: boolean;
    label?: string;
    className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    showLabel = false,
    label = '',
    className = ''
}) => {
    const normalizedProgress = Math.min(Math.round(progress || 0), 100);
    const progressStyle = {
        width: `${normalizedProgress}%`,
        transition: normalizedProgress > 0 ? 'width 0.3s ease-in-out' : 'none'
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {showLabel && (
                <div className="flex justify-between text-sm text-gray-600">
                    <span>{label}</span>
                    <span>{normalizedProgress}%</span>
                </div>
            )}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                    className="bg-blue-500 h-full rounded-full"
                    style={progressStyle}
                />
            </div>
        </div>
    );
};