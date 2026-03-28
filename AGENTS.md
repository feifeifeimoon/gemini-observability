<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16 Breaking Changes
This project uses Next.js 16.2.0, which contains breaking changes to APIs and conventions compared to your training data. 
Read the guides in `node_modules/next/dist/docs/` before implementing new features.
<!-- END:nextjs-agent-rules -->

# General Coding Standards
- Use TypeScript for all new files.
- Prefer functional components and React Hooks.
- Follow the established Tailwind CSS 4.0 styling patterns.
- Always use `clsx` and `tailwind-merge` for conditional class names.
- Ensure all OTLP ingestion routes handle JSON payloads correctly according to the Protobuf-to-JSON mapping.
