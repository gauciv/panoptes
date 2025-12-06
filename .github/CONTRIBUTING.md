# Contributing to Panoptes

Thank you for your interest in contributing to Panoptes! 🎉

This document provides guidelines for contributing to the project. By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## 📋 Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

---

## 🚀 Getting Started

### Prerequisites
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Demeter.run API Key](https://demeter.run/) (for testing)

### First Time Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/panoptes.git
   cd panoptes
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/gauciv/panoptes.git
   ```

3. **Install dependencies**
   ```bash
   # Backend
   dotnet restore
   
   # Frontend
   cd Panoptes.Client
   npm install
   ```

4. **Configure your environment**
   ```bash
   cp Panoptes.Api/appsettings.json Panoptes.Api/appsettings.Local.json
   # Edit appsettings.Local.json with your Demeter API key
   ```

5. **Verify setup**
   ```bash
   # Build backend
   dotnet build
   
   # Run tests
   dotnet test
   ```

---

## 💻 Development Setup

### Running Locally

**Backend:**
```bash
dotnet run --project Panoptes.Api
# Runs on http://localhost:5033
```

**Frontend:**
```bash
cd Panoptes.Client
npm run dev
# Runs on http://localhost:5173
```

### Project Structure
```
panoptes/
├── Panoptes.Api/          # ASP.NET Core API
│   ├── Controllers/       # API endpoints
│   ├── Workers/           # Background services
│   └── Auth/              # Authentication
├── Panoptes.Core/         # Domain entities & interfaces
│   ├── Entities/          # Data models
│   └── Interfaces/        # Abstractions
├── Panoptes.Infrastructure/ # Services & data access
│   ├── Services/          # Business logic
│   ├── Persistence/       # Database context
│   └── Providers/         # External service integrations
├── Panoptes.Client/       # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API clients
│   │   └── types/         # TypeScript types
└── Panoptes.Tests/        # Unit & integration tests
```

---

## 🤝 How to Contribute

### Areas We Need Help With

#### 🐛 Bug Fixes
- Check [open issues](https://github.com/gauciv/panoptes/issues?q=is%3Aissue+is%3Aopen+label%3Abug)
- Look for issues tagged with `good first issue`

#### ✨ New Features
- Review [feature requests](https://github.com/gauciv/panoptes/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
- Propose new features via issues first

#### 📝 Documentation
- Fix typos or improve clarity
- Add usage examples
- Write tutorials or guides

#### 🧪 Testing
- Add unit tests
- Improve test coverage
- Write integration tests

#### 🎨 UI/UX
- Improve dashboard design
- Enhance user experience
- Add accessibility features

### Finding Issues to Work On

**Labels to look for:**
- `good first issue` - Great for newcomers
- `help wanted` - Community contributions welcome
- `documentation` - Documentation improvements
- `bug` - Bug fixes needed
- `enhancement` - New features

---

## 📏 Coding Standards

### C# (.NET)
- Follow [Microsoft C# Coding Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- Use meaningful variable names
- Add XML documentation comments for public APIs
- Keep methods focused and small (< 50 lines)
- Use async/await for I/O operations

**Example:**
```csharp
/// <summary>
/// Dispatches a webhook notification to the specified endpoint
/// </summary>
/// <param name="subscription">The webhook subscription</param>
/// <param name="payload">The payload to send</param>
/// <returns>Delivery log with status information</returns>
public async Task<DeliveryLog> DispatchAsync(
    WebhookSubscription subscription, 
    object payload)
{
    // Implementation
}
```

### TypeScript/React
- Follow [Airbnb React Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- Use functional components with hooks
- Use TypeScript strict mode
- Use meaningful component names
- Keep components small and focused

**Example:**
```typescript
interface SubscriptionCardProps {
  subscription: WebhookSubscription;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  onDelete
}) => {
  // Implementation
};
```

### General Guidelines
- **DRY**: Don't Repeat Yourself
- **KISS**: Keep It Simple, Stupid
- **YAGNI**: You Aren't Gonna Need It
- **SOLID**: Follow SOLID principles
- **Comments**: Explain "why", not "what"

---

## 🧪 Testing

### Running Tests

**All tests:**
```bash
dotnet test
```

**Specific project:**
```bash
dotnet test Panoptes.Tests/Panoptes.Tests.csproj
```

**With coverage:**
```bash
dotnet test /p:CollectCoverage=true
```

### Writing Tests

**Unit Test Example:**
```csharp
[Fact]
public async Task DispatchAsync_WithValidSubscription_ReturnsSuccessLog()
{
    // Arrange
    var subscription = new WebhookSubscription { /* ... */ };
    var payload = new { Event = "test" };
    
    // Act
    var result = await _dispatcher.DispatchAsync(subscription, payload);
    
    // Assert
    Assert.Equal(DeliveryStatus.Success, result.Status);
}
```

### Test Guidelines
- Use Arrange-Act-Assert pattern
- One assertion per test (when possible)
- Use descriptive test names
- Mock external dependencies
- Aim for > 80% code coverage

---

## 📝 Documentation

### Code Documentation
- Add XML comments for public APIs
- Document complex algorithms
- Include usage examples
- Explain non-obvious decisions

### README Updates
When adding features, update:
- Feature list
- Configuration options
- Usage examples
- API documentation

### Inline Comments
```csharp
// Good: Explains why
// Using sliding window to prevent burst attacks
var rateLimitWindow = TimeSpan.FromMinutes(1);

// Bad: Explains what (obvious from code)
// Set rate limit window to 1 minute
var rateLimitWindow = TimeSpan.FromMinutes(1);
```

---

## 📋 Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `security`: Security fixes

### Examples
```bash
feat(webhooks): add HMAC signature verification

Implements HMAC-SHA256 signatures for webhook payloads to allow
recipients to verify authenticity.

Closes #123

---

fix(parser): handle 0-value outputs correctly

Previously, outputs with 0 ADA were incorrectly filtered.
Now properly detects and logs parsing failures.

Related to #456

---

docs(readme): add troubleshooting section

Adds common issues and solutions based on user feedback.
```

### Commit Message Rules
- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit subject line to 50 characters
- Wrap body at 72 characters
- Reference issues and PRs in footer

---

## 🔄 Pull Request Process

### Before Submitting

1. **Update your fork**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feat/my-awesome-feature
   ```

3. **Make your changes**
   - Write clean code
   - Add tests
   - Update documentation

4. **Test thoroughly**
   ```bash
   dotnet test
   cd Panoptes.Client && npm test
   ```

5. **Commit with good messages**
   ```bash
   git add .
   git commit -m "feat(api): add new endpoint for bulk operations"
   ```

6. **Push to your fork**
   ```bash
   git push origin feat/my-awesome-feature
   ```

### Submitting the PR

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out the PR template completely
4. Link related issues
5. Request review from maintainers

### PR Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed my code
- [ ] Added/updated tests
- [ ] All tests pass
- [ ] Updated documentation
- [ ] No merge conflicts
- [ ] Commit messages follow guidelines
- [ ] PR description is complete

### Review Process

1. **Automated checks run** (when CI/CD is set up)
2. **Maintainer reviews code**
   - May request changes
   - May ask questions
3. **Address feedback**
   - Make requested changes
   - Push updates to same branch
4. **Final approval**
5. **Merge!** 🎉

### After Merge

1. **Delete your branch**
   ```bash
   git branch -d feat/my-awesome-feature
   git push origin --delete feat/my-awesome-feature
   ```

2. **Update your fork**
   ```bash
   git checkout main
   git pull upstream main
   ```

---

## 🌐 Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Pull Requests**: Code contributions

### Getting Help

- Check [existing issues](https://github.com/gauciv/panoptes/issues)
- Read the [README](../README.md)
- Review [Security Policy](../SECURITY.md)
- Ask questions in GitHub Discussions

### Reporting Bugs

1. Check if issue already exists
2. Use bug report template
3. Include reproduction steps
4. Provide environment details
5. Attach relevant logs

### Suggesting Features

1. Check if feature is already requested
2. Use feature request template
3. Explain use case clearly
4. Consider implementation details
5. Be open to discussion

---

## 🏆 Recognition

Contributors will be:
- Listed in README
- Mentioned in release notes
- Credited in commit messages
- Acknowledged in documentation

---

## 📄 License

By contributing to Panoptes, you agree that your contributions will be licensed under the [MIT License](../LICENSE).

---

## 🙏 Thank You!

Your contributions make Panoptes better for everyone. We appreciate your time and effort! ❤️

**Questions?** Don't hesitate to ask in GitHub Issues or Discussions.

**Ready to contribute?** Find an issue and start coding! 🚀

---

<div align="center">
  <p>Made with ❤️ by the Panoptes Community</p>
</div>
