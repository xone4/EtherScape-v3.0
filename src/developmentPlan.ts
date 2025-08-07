export const developmentPlan = {
  name: 'Ambitious Image Editor',
  description:
    'A multi-phase project to build a feature-rich, AI-powered image editor with a focus on user experience and cutting-edge technology.',
  phases: [
    {
      name: 'Phase 1: Core Functionality & Refactoring',
      description:
        'Establish a solid foundation with essential features and a well-structured codebase.',
      tasks: [
        {
          title: 'Component-Level State Management',
          description:
            'Refactor components to manage their own state where appropriate, reducing the amount of state managed in the top-level App component. This will improve modularity and make the application easier to maintain.',
          status: 'completed',
          subTasks: [
            {
              title: 'Refactor `Controls` Component',
              description:
                'Move state related to the controls, such as `themeInput` and `seedInput`, into the `Controls` component itself.',
              status: 'completed',
            },
            {
              title: 'Refactor `ImageHistory` Component',
              description:
                'Move state related to the image history, such as `activeTab`, into the `ImageHistory` component.',
              status: 'completed',
            },
            {
              title: 'Refactor `ImageEditorDrawer` Component',
              description:
                'Move state related to the image editor, such as `isErasing` and `brushSize`, into the `ImageEditorDrawer` component.',
              status: 'completed',
            },
          ],
        },
        {
          title: 'Advanced Image Editing Tools',
          description:
            'Implement more sophisticated image editing capabilities, such as object removal and background replacement.',
          status: 'completed',
          subTasks: [
            {
              title: 'Object Removal',
              description:
                'Allow users to remove objects from an image by masking them and using an in-painting API.',
              status: 'completed',
            },
            {
              title: 'Background Replacement',
              description:
                'Enable users to replace the background of an image with a new one generated from a text prompt.',
              status: 'completed',
            },
          ],
        },
        {
          title: 'UI/UX Enhancements',
          description:
            'Improve the user interface and experience with more intuitive controls and visual feedback.',
          status: 'future',
          subTasks: [
            {
              title: 'Drag-and-Drop Image Upload',
              description:
                'Allow users to upload images by dragging and dropping them onto the application.',
              status: 'future',
            },
            {
              title: 'Progress Indicators',
              description:
                'Provide more detailed progress indicators for image generation and editing tasks.',
              status: 'future',
            },
          ],
        },
      ],
    },
    {
      name: 'Phase 2: Cloud Integration & Collaboration',
      description:
        'Integrate with cloud services for storage and enable real-time collaboration features.',
      tasks: [
        {
          title: 'Cloud Storage',
          description:
            'Allow users to save and load their work from a cloud storage provider, such as Google Drive or Dropbox.',
          status: 'future',
          subTasks: [
            {
              title: 'Authentication',
              description:
                'Implement OAuth 2.0 for authenticating with cloud storage providers.',
              status: 'future',
            },
            {
              title: 'File Management',
              description:
                'Allow users to browse, open, and save images from their cloud storage.',
              status: 'future',
            },
          ],
        },
        {
          title: 'Real-Time Collaboration',
          description:
            'Enable multiple users to edit the same image in real-time, using a technology like WebSockets.',
          status: 'future',
          subTasks: [
            {
              title: 'Shared Editing Sessions',
              description:
                'Allow users to create and join shared editing sessions.',
              status: 'future',
            },
            {
              title: 'Real-Time Updates',
              description:
                'Synchronize editing actions between all users in a session.',
              status: 'future',
            },
          ],
        },
      ],
    },
    {
      name: 'Phase 3: AI-Powered Features & Monetization',
      description:
        'Introduce advanced AI-powered features and explore monetization strategies.',
      tasks: [
        {
          title: 'AI-Powered Style Transfer',
          description:
            'Allow users to apply the style of one image to another, using a neural style transfer model.',
          status: 'future',
          subTasks: [
            {
              title: 'Style Selection',
              description:
                'Provide a curated list of styles for users to choose from, as well as the ability to upload their own style images.',
              status: 'future',
            },
            {
              title: 'Style Transfer API Integration',
              description:
                'Integrate with a style transfer API to perform the style transfer.',
              status: 'future',
            },
          ],
        },
        {
          title: 'Monetization',
          description:
            'Explore various monetization strategies, such as a subscription model or a pay-per-use model.',
          status: 'future',
          subTasks: [
            {
              title: 'Subscription Model',
              description:
                'Offer a subscription model with different tiers of features and usage limits.',
              status: 'future',
            },
            {
              title: 'Pay-Per-Use Model',
              description:
                'Allow users to pay for specific features or a certain number of API calls.',
              status: 'future',
            },
          ],
        },
      ],
    },
  ],
};
