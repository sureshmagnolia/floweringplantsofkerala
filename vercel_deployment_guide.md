# Vercel Deployment Walkthrough

Deploying your Next.js application to Vercel is incredibly straightforward since Vercel is built specifically for Next.js and integrates seamlessly with GitHub.

Here is the step-by-step guide to get your app live on the internet:

## 1. Sign in to Vercel
1. Go to [vercel.com](https://vercel.com).
2. Click **Sign Up** or **Log In**.
3. Choose **Continue with GitHub** and authorize Vercel to access your GitHub account. 

## 2. Import Your Repository
1. Once logged into the Vercel dashboard, click the black **Add New...** button in the top right corner and select **Project**.
2. Under the "Import Git Repository" section, you should see a list of your GitHub repositories.
3. Find `floweringplantsofkerala` and click the **Import** button next to it.
   > [!NOTE]
   > If you don't see the repository, you may need to click "Adjust GitHub App Permissions" to grant Vercel access to that specific repository.

## 3. Configure the Project
You will be taken to a configuration page. Because Vercel automatically detects Next.js projects, **you don't need to change anything here**.

Just confirm that:
- **Framework Preset** is set to `Next.js`.
- **Build and Output Settings** are left at their default values (`npm run build`).

## 4. Deploy
1. Click the blue **Deploy** button.
2. Vercel will now clone your code, install dependencies (`npm install`), and build the production version of the app.
3. This process usually takes 1-2 minutes. You can watch the terminal logs on the screen as it builds.

## 5. View Your Live Site
Once the deployment finishes, you will see a success screen with fireworks!
- Click the **Continue to Dashboard** button.
- On your project dashboard, click the **Visit** button (or click on the generated `*.vercel.app` domains) to see your live application.

> [!TIP]
> **Continuous Deployment**: From now on, whenever you make changes to your code on your local computer and run `git push origin main`, Vercel will automatically detect the push and deploy the updated version of your app within minutes! You don't have to touch the Vercel dashboard again for normal updates.
