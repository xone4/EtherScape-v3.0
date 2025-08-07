import React from 'react';
import classNames from 'classnames';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <>
      <div className={classNames("bg-gray-700 rounded-md shimmer", className)} />
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        .shimmer {
          background-image: linear-gradient(to right, #2d3748 0%, #4a5568 20%, #2d3748 40%, #2d3748 100%);
          background-repeat: no-repeat;
          background-size: 2000px 100%;
          animation: shimmer 2s linear infinite;
        }
      `}</style>
    </>
  );
};

export default Skeleton;
