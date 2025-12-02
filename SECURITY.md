# Security

## Docker Security

### Non-Root User

The Docker image runs as a non-root user (`node`, UID 1000, GID 1000) to enhance security:

- **User**: The application runs as the `node` user, which is included in the base node:20 image
- **Benefits**:
  - Compatible with Kubernetes Pod Security Policies (PSP) and Pod Security Admission (PSA)
  - Reduces attack surface if the application is compromised
  - Prevents privilege escalation attacks
  - Follows security best practices for containerized applications

### Directory Permissions

The following directories are owned by the `node` user and have write permissions:

- `/app` - Application code and dependencies
- `/workspace` - Git repositories and workspace data
- `/app/data` - SQLite database and application data
- `/home/node/.bun` - Bun runtime installation
- `/home/node/.opencode` - OpenCode installation
- `/home/node/.local` - User-local binaries

### Kubernetes Deployment

The image is compatible with restrictive security contexts:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: false  # Required for /workspace and /app/data writes
```

For enhanced security with read-only root filesystem:

```yaml
securityContext:
  readOnlyRootFilesystem: true
volumes:
  - name: workspace
    emptyDir: {}
  - name: data
    emptyDir: {}
  - name: tmp
    emptyDir: {}
volumeMounts:
  - name: workspace
    mountPath: /workspace
  - name: data
    mountPath: /app/data
  - name: tmp
    mountPath: /tmp
```
