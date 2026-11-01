import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        index: `${projectRoot}/index.html`,
        'screens/login': `${projectRoot}/screens/login.html`,
        'screens/dashboard': `${projectRoot}/screens/dashboard.html`,
        'screens/basic-profile': `${projectRoot}/screens/basic-profile.html`,
        'screens/body-composition': `${projectRoot}/screens/body-composition.html`,
        'screens/physical-activity': `${projectRoot}/screens/physical-activity.html`,
        'screens/diet': `${projectRoot}/screens/diet.html`,
        'screens/sleep': `${projectRoot}/screens/sleep.html`,
        'screens/mental-health': `${projectRoot}/screens/mental-health.html`,
        'screens/lifestyle-habits': `${projectRoot}/screens/lifestyle-habits.html`,
        'screens/optional-health-data': `${projectRoot}/screens/optional-health-data.html`,
        'screens/results': `${projectRoot}/screens/results.html`,
        'screens/scores-and-recommendations': `${projectRoot}/screens/scores-and-recommendations.html`,
        'screens/progress': `${projectRoot}/screens/progress.html`,
        'screens/settings': `${projectRoot}/screens/settings.html`,
        'screens/forgot-password': `${projectRoot}/screens/forgot-password.html`,
        'screens/reset-password': `${projectRoot}/screens/reset-password.html`,
      },
    },
  },
})
