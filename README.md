# Quartz v4

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>

## Quartz v5

Quartz v5 is now available with enhanced features while maintaining full backward compatibility with v4:

### New Features

- **Plugin Versioning**: Semantic versioning and capability negotiation
- **Multi-Format Support**: Loaders for Markdown, assets, and custom formats
- **Faster Builds**: Content-addressed caching and dependency tracking
- **Layout Registry**: Pre-define layouts selectable via frontmatter
- **Lockfile System**: Reproducible builds with version locking
- **Enhanced Security**: SRI hash generation for resources
- **Better Validation**: Type-safe configuration

### Documentation

- [v5 Migration Guide](./docs/v5-migration.md) - Learn how to adopt v5 features
- [Plugin Development Guide](./docs/v5-plugin-development.md) - Create v5 plugins
- [Example v5 Config](./quartz.config.v5-example.ts) - See all v5 features in action

Your existing v4 configuration works without changes! All v5 features are opt-in.
