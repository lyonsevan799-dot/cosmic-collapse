<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep arena simulation gated by Engine.arena and skip permanent save updates in arena mode so endless progress remains independent.
- Reuse the existing Canvas object physics for bots; arena helpers stay in src/game/arena.ts to keep AI rules testable without UI.
- Package standalone exports from a temporary Vite client entry that mounts the existing game, leaving TanStack Start routing and deployment unchanged.
