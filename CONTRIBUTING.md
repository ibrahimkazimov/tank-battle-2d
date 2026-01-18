# Contributing to Tank Battle 2D

First off, thanks for taking the time to contribute!

The following is a set of guidelines for contributing to Tank Battle 2D. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the steps to reproduce the problem** in as much detail as possible.
- **Include screenshots or animated GIFs** which show you following the steps to reproduce the problem.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as much detail as possible.
- **Explain why this enhancement would be useful** to most users.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested.
3. Make sure your code lints.
4. Issue that pull request!

## Development Setup

This project is a monorepo managed with **npm workspaces**.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ibrahimkazimov/tank-battle-2d.git
    cd tank-battle-2d
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Start Development Servers:**
    - **Client:** `npm run dev:client`
    - **Server:** `npm run start:server`

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
