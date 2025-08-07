import React from 'react';
import Joyride, { Step } from 'react-joyride-react-19';
import { tourSteps } from '../tourSteps';

interface OnboardingTourProps {
  run: boolean;
  onClose: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ run, onClose }) => {
  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={({ status }) => {
        if (status === 'finished' || status === 'skipped') {
          onClose();
        }
      }}
      styles={{
        options: {
          arrowColor: '#4a5568',
          backgroundColor: '#2d3748',
          overlayColor: 'rgba(0, 0, 0, 0.8)',
          primaryColor: '#3b82f6',
          textColor: '#e2e8f0',
          zIndex: 1000,
        },
      }}
    />
  );
};

export default OnboardingTour;
