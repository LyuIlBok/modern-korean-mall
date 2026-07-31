# AgriLeitner Mobile Native Wrapper

This is a mobile native app wrapper scaffold powered by [Capacitor](https://capacitorjs.com/).

## Live Server & OTA Updates Configuration

The file `capacitor.config.json` is configured to point to a future production web deployment:

```json
{
  "server": {
    "url": "https://agri-word-app.vercel.app",
    "cleartext": true
  }
}
```

### Why this URL configuration?
- **Instant Over-The-Air (OTA) Updates:** By pointing the native app's source URL to your hosted web app, any updates you deploy to `https://agri-word-app.vercel.app` will be immediately visible to your mobile users without requiring them to download a new app update from the Google Play Store or Apple App Store.
- **Development/Customization:** You can modify the `"url"` key in `capacitor.config.json` to point to any other URL (including `http://localhost:3000` during local development) or remove the `"server"` block entirely if you want the app to run completely offline from the local assets in the `www/` folder.

## Fallback Local Assets

A fallback copy of `leitner_app.html` has been copied to `www/index.html`. This ensures that there is a local, offline-capable version of the app bundled in the native package, which can be loaded if the remote server is unreachable.
