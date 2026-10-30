---
name: no-use-effect
description: >-
  Enforce the no-useEffect rule when writing or reviewing React code.
  ACTIVATE when writing React components, refactoring existing useEffect calls,
  reviewing PRs with useEffect, or when an agent adds useEffect "just in case."
  Provides the five replacement patterns and the useMountEffect escape hatch.
license: MIT
metadata:
  credits:
    author: trycompai
    url: "https://github.com/trycompai/crm/tree/2fa1a91/.agents/skills/no-use-effect"
---

# No useEffect

Never call `useEffect` directly. Use derived state, event handlers, TanStack Query, or `useMountEffect` instead.

## Quick Reference

- Lint rule: `no-restricted-syntax` in `apps/web/eslint.config.mjs` bans `useEffect(...)` and `React.useEffect(...)`.
- React docs: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- Origin: [https://x.com/alvinsng/status/2033969062834045089](https://x.com/alvinsng/status/2033969062834045089)

| Instead of useEffect for...           | Use                                           |
| ------------------------------------- | --------------------------------------------- |
| Deriving state from other state/props | Inline computation (Rule 1)                   |
| Fetching data                         | A `hooks/api` hook over TanStack Query (Rule 2) |
| Responding to user actions            | Event handlers (Rule 3)                       |
| One-time external sync on mount       | `useMountEffect` (Rule 4)                     |
| Resetting state when a prop changes   | `key` prop on parent (Rule 5)                 |

## When to Use This Skill

- Writing new React components
- Refactoring existing `useEffect` calls
- Reviewing PRs that introduce `useEffect`
- An agent adds `useEffect` "just in case"

## Workflow

### 1. Identify the useEffect

Determine what the effect is doing: deriving state, fetching data, responding to an event, syncing with an external system, or resetting state.

### 2. Apply the Correct Replacement Pattern

Use the five rules below to pick the right replacement.

### 3. Verify

```sh
pnpm nx run-many -t lint typecheck test -p web
```

## The Escape Hatch: useMountEffect

For the rare case where you need to sync with an external system on mount. It wraps `useEffect` with an empty dependency array to make the intent explicit. Create it in `apps/web/src/hooks/ui/use-mount-effect.ts` the first time it's needed:

```ts
import { type EffectCallback, useEffect } from 'react';

export const useMountEffect = (effect: EffectCallback) => {
  // eslint-disable-next-line no-restricted-syntax, react-hooks/exhaustive-deps
  useEffect(effect, []);
};
```

This is the only place an `eslint-disable` for the rule is allowed.

## Replacement Patterns

### Rule 1: Derive state, do not sync it

Most effects that set state from other state are unnecessary and add extra renders.

```tsx
// BAD: Two render cycles - first stale, then filtered
const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    setFilteredProducts(products.filter((p) => p.inStock));
  }, [products]);
};

// GOOD: Compute inline in one render
const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const filteredProducts = products.filter((p) => p.inStock);
};
```

**Smell test:** You are about to write `useEffect(() => setX(deriveFromY(y)), [y])`, or you have state that only mirrors other state or props.

### Rule 2: Use TanStack Query

Effect-based fetching creates race conditions and duplicated caching logic. Fetch through the resource's query-options factory in `libs/api/` and a one-line hook in `hooks/api/`.

```tsx
// BAD: Race condition risk
const ProductPage = ({ productId }: { productId: string }) => {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProduct(productId).then(setProduct);
  }, [productId]);
};

// GOOD: TanStack Query handles cancellation, caching and staleness
// hooks/api/use-product.ts
export const useProduct = (productId: string) =>
  useQuery(productQueries.detail(productId));

const ProductPage = ({ productId }: { productId: string }) => {
  const { data: product } = useProduct(productId);
};
```

**Smell test:** Your effect does `fetch(...)` and then `setState(...)`, or you are re-implementing caching, retries, cancellation, or stale handling.

### Rule 3: Event handlers, not effects

If a user clicks a button, do the work in the handler.

```tsx
// BAD: Effect as an action relay
const LikeButton = () => {
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (liked) {
      postLike();
      setLiked(false);
    }
  }, [liked]);

  return <Button onClick={() => setLiked(true)}>Like</Button>;
};

// GOOD: Direct event-driven action
const LikeButton = () => <Button onClick={() => postLike()}>Like</Button>;
```

**Smell test:** State is used as a flag so an effect can do the real action, or you are building "set flag -> effect runs -> reset flag" mechanics.

### Rule 4: useMountEffect for one-time external sync

Good uses: DOM integration (focus, scroll), third-party widget lifecycles, browser API subscriptions.

```tsx
// BAD: Guard inside effect
const VideoPlayer = ({ isLoading }: { isLoading: boolean }) => {
  useEffect(() => {
    if (!isLoading) playVideo();
  }, [isLoading]);
};

// GOOD: Mount only when preconditions are met
const VideoPlayerWrapper = ({ isLoading }: { isLoading: boolean }) => {
  if (isLoading) return <LoadingScreen />;
  return <VideoPlayer />;
};

const VideoPlayer = () => {
  useMountEffect(() => playVideo());
};
```

Use `useMountEffect` for stable dependencies (singletons, refs, context values that never change):

```tsx
// BAD: useEffect with dependency that never changes
useEffect(() => {
  connectionManager.on('connected', handleConnect);
  return () => connectionManager.off('connected', handleConnect);
}, [connectionManager]); // connectionManager is a singleton from context

// GOOD: useMountEffect for stable dependencies
useMountEffect(() => {
  connectionManager.on('connected', handleConnect);
  return () => connectionManager.off('connected', handleConnect);
});
```

**Smell test:** You are synchronizing with an external system, and the behavior is naturally "setup on mount, cleanup on unmount."

### Rule 5: Reset with key, not dependency choreography

```tsx
// BAD: Effect attempts to emulate remount behavior
const VideoPlayer = ({ videoId }: { videoId: string }) => {
  useEffect(() => {
    loadVideo(videoId);
  }, [videoId]);
};

// GOOD: key forces clean remount
const VideoPlayer = ({ videoId }: { videoId: string }) => {
  useMountEffect(() => {
    loadVideo(videoId);
  });
};

const VideoPlayerWrapper = ({ videoId }: { videoId: string }) => (
  <VideoPlayer key={videoId} videoId={videoId} />
);
```

**Smell test:** You are writing an effect whose only job is to reset local state when an ID/prop changes, or you want the component to behave like a brand-new instance for each entity.

## Component Structure Convention

Computed values come after hooks and local state, never via `useEffect`:

```tsx
export const FeatureComponent = ({ featureId }: { featureId: string }) => {
  // Hooks first
  const { data, isPending } = useFeature(featureId);

  // Local state
  const [isOpen, setIsOpen] = useState(false);

  // Computed values (NOT useEffect + setState)
  const displayName = data?.name ?? 'Unknown';

  // Event handlers
  const handleClick = () => {
    setIsOpen(true);
  };

  // Early returns
  if (isPending) return <CircularProgress aria-label="Loading" />;

  // Render
  return <Stack spacing={2}>...</Stack>;
};
```
