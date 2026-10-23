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

- The independent deployment keeps TanStack Start and uses a separate Node/Nitro Vite configuration to preserve routes without the managed hosting plugins.
- Console auth, data, configuration and commands use same-origin `/api/ghost` endpoints served by the Node engine through Nginx; no Cloud sync or browser exchange traffic is permitted.
- The initial independent engine is read-only and rejects trading commands until an executor, protective orders and reconciliation are implemented and verified; environment flags alone cannot unlock trading.
- Keep deployment steps in a shared browser-safe module and mirror them in the README so installation instructions stay consistent.
- Engine tests use their own Node Vitest configuration so they never inherit the console's browser setup.
