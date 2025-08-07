# Etherscape: Your AI-Powered Creative Suite

Etherscape is a powerful, open-source creative suite that allows you to generate stunning images, videos, and audio using the power of artificial intelligence. Whether you're a professional artist, a hobbyist, or just curious about the creative potential of AI, Etherscape provides you with the tools you need to bring your ideas to life.

## Features

Etherscape is packed with features to help you unleash your creativity:

*   **Multi-Provider Image Generation:** Generate images using a variety of AI models from different providers, including Google Gemini, Stability AI, Leonardo.AI, and more.
*   **Advanced Image Editing:** Go beyond simple generation with our advanced image editor, which includes tools for in-painting, out-painting, color adjustments, filters, and text overlays.
*   **Video and Audio Generation:** Bring your creations to life with video and audio generation. Animate your images, create short video clips, and generate AI-powered soundscapes and music.
*   **Google Drive Integration:** Seamlessly save and load your creations to and from your Google Drive.
*   **Onboarding Tour:** A guided tour to help new users get started with the application.
*   **And much more!** Etherscape is constantly evolving, with new features and improvements being added all the time.

## Getting Started

To get started with Etherscape, you'll need to have Node.js installed on your system.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/etherscape.git
    ```
2.  **Install dependencies:**
    ```bash
    cd etherscape
    npm install
    ```
3.  **Set up your API keys:**
    *   Create a file named `.env.local` in the root of the project.
    *   Add your Gemini API key to the file:
        ```
        GEMINI_API_KEY=your_gemini_api_key
        ```
    *   You can also add API keys for other providers in the "Advanced Settings" section of the application.
4.  **Run the application:**
    ```bash
    npm run dev
    ```

The application will now be running at `http://localhost:3000`.

## Usage

Etherscape is designed to be intuitive and easy to use. Here's a quick overview of how to get started:

1.  **Enter a theme:** Start by entering a theme or concept for your creation in the main input field.
2.  **Choose an art style:** Select an art style from the dropdown menu to give your creation a unique look.
3.  **Generate:** Click the "Generate Single Image" button to create a single image based on your settings, or click "Start Evolving" to have the AI continuously generate new images based on your theme.
4.  **Explore the history:** Your generated images will be saved in the history drawer, where you can view, edit, and download them.
5.  **Experiment!** The best way to learn Etherscape is to experiment with the different settings and features. Don't be afraid to try new things and see what you can create.

## Roadmap

Etherscape is on a journey to become a world-class, professional-grade creative suite. The previous phases focused on core functionality, cloud integration, and initial AI features. The next evolution of Etherscape is defined by the following four phases:

### Phase 1: The Professional Studio - Core Experience & Workflow
This phase is dedicated to building a rock-solid foundation for professional artists. Key features include a robust state management overhaul, an advanced layer-based image editor, customizable workspaces and UI themes, and powerful productivity tools like batch processing and a project file system.

### Phase 2: Expanding the AI Palette - Advanced Generation & Multimedia
This phase moves beyond still images to deliver a true multimedia experience. It will introduce suites for AI-powered video generation and editing, advanced text-to-music and sound effect generation, and text/image-to-3D model creation. A key innovation will be a node-based "Creative Chain-of-Thought" editor for combining AI models.

### Phase 3: The Connected Creator - Community & Collaboration
This phase focuses on transforming Etherscape from a tool into a platform. We will build a vibrant community hub with public galleries, social features, and asset sharing. This phase will also introduce real-time collaborative canvases for teams and a public API and plugin marketplace to open the platform to third-party developers.

### Phase 4: Polishing & Professionalization
The final phase is about refinement and enterprise-readiness. This includes deep performance optimization, ensuring full accessibility (WCAG 2.1 compliance), writing comprehensive documentation, and expanding monetization options with tiered subscription plans.

## Contributing

We welcome contributions from the community! If you'd like to contribute to Etherscape, please see our [contributing guidelines](CONTRIBUTING.md).

## License

Etherscape is open-source software licensed under the [MIT license](LICENSE).
