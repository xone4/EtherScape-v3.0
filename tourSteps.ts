import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: '.image-display',
    content: 'This is where your generated images will appear. Welcome to Etherscape!',
    disableBeacon: true,
  },
  {
    target: '.controls-drawer-content',
    content: 'Use the controls here to guide the AI. Enter a theme, choose an art style, and more.',
  },
  {
    target: '.history-drawer',
    content: 'Your generated images will be saved here. You can come back to them at any time.',
  },
  {
    target: '.generate-button',
    content: 'Click here to generate a single image based on your settings.',
  },
  {
    target: '.start-stop-button',
    content: 'Or click here to start an "evolution", where the AI will continuously generate new images based on your theme.',
  },
];
