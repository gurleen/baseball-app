# Routing

This app uses [react-router v7](https://reactrouter.com) with `BrowserRouter`. All routes are defined in `src/App.tsx`.

## Adding a new page

1. Create `src/pages/MyPage.tsx`:

```tsx
export default function MyPage() {
  return <h1>My Page</h1>;
}
```

2. Register it in `src/App.tsx`:

```tsx
import MyPage from "./pages/MyPage";

// inside <Routes>:
<Route path="/my-page" element={<MyPage />} />
```

3. Link to it from anywhere:

```tsx
import { Link } from "react-router";

<Link to="/my-page">My Page</Link>
```

---

## Routing patterns

### Static route

A fixed URL with no variables.

```tsx
<Route path="/about" element={<About />} />
```

### Dynamic segment (e.g. `/players/:id`)

Use a `:param` segment for variable parts of the URL.

```tsx
<Route path="/players/:id" element={<PlayerDetail />} />
```

Read the param inside the page with `useParams`:

```tsx
import { useParams } from "react-router";

export default function PlayerDetail() {
  const { id } = useParams();
  return <h1>Player {id}</h1>;
}
```

### Multiple dynamic segments (e.g. `/teams/:teamId/players/:playerId`)

Chain as many `:param` segments as needed:

```tsx
<Route path="/teams/:teamId/players/:playerId" element={<PlayerDetail />} />
```

```tsx
const { teamId, playerId } = useParams();
```

### Nested routes

Nest `<Route>` elements to share a common layout (e.g. a sidebar).

```tsx
<Route path="/teams" element={<TeamsLayout />}>
  <Route index element={<TeamsList />} />
  <Route path=":teamId" element={<TeamDetail />} />
</Route>
```

The parent layout renders child routes via `<Outlet />`:

```tsx
import { Outlet, Link } from "react-router";

export default function TeamsLayout() {
  return (
    <div>
      <nav>{/* team nav links */}</nav>
      <Outlet />
    </div>
  );
}
```

`index` marks the default child rendered at the parent path (`/teams`).

### Optional / catch-all (404)

Add a wildcard route at the end of `<Routes>` to catch unmatched URLs:

```tsx
<Route path="*" element={<NotFound />} />
```

### Query parameters

Query strings (`?sort=asc`) are not part of the route definition. Read them with `useSearchParams`:

```tsx
import { useSearchParams } from "react-router";

export default function PlayersList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort"); // "asc" | null
}
```

### Programmatic navigation

Navigate without a `<Link>` using `useNavigate`:

```tsx
import { useNavigate } from "react-router";

export default function LoginPage() {
  const navigate = useNavigate();

  function handleLogin() {
    // ... auth logic
    navigate("/dashboard");
  }
}
```
