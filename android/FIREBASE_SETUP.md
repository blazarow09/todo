# Firebase Android Setup

To enable Firebase Authentication on Android, you need to add your `google-services.json` file.

## Steps

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select your project (my-tasks-1bb0c)

2. **Add Android App**
   - Click the gear icon ⚙️ > Project settings
   - Scroll down to "Your apps"
   - Click "Add app" > Android icon
   - Enter package name: `com.todo.widget`
   - (Optional) Enter app nickname: My Tasks
   - Click "Register app"

3. **Download google-services.json**
   - Click "Download google-services.json"
   - Save the file to: `android/app/google-services.json`

4. **Add SHA-1 fingerprint (for Google Sign-In)**
   If you plan to use Google Sign-In, you need to add your debug SHA-1:
   
   ```bash
   # On Windows (from android folder)
   cd android
   gradlew.bat signingReport
   
   # On Mac/Linux
   cd android
   ./gradlew signingReport
   ```
   
   Copy the SHA-1 from the debug variant and add it in Firebase Console:
   - Project settings > Your apps > Android app
   - Click "Add fingerprint"
   - Paste the SHA-1

5. **Rebuild the app**
   ```bash
   npm run cap:sync
   ```

## Verification

After adding `google-services.json`, the build should complete without the warning:
"google-services.json not found, google-services plugin not applied"

## Troubleshooting

- **Build fails after adding google-services.json**: Make sure the package name in the file matches `com.todo.widget`
- **Auth not working**: Verify the SHA-1 fingerprint is added in Firebase Console
- **Push notifications not working**: Ensure you've enabled Cloud Messaging in Firebase Console

