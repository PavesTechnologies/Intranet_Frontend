@Library('shared-lib') _

buildFrontendPipeline([

    // ── Required ──────────────────────────────────────────────────────────────
    appName        : 'Intranet Frontend',

    // AWS Secrets Manager secret containing runtime config as a JSON object.
    // These values become window.__APP_CONFIG__ in the browser — they are NOT
    // passed to the Vite build process.
    //
    // Example secret stored at 'intranet/frontend/runtime-prod':
    // {
    // TIMESHEET_API_ENDPOINT: "http://localhost:5000",
    // USER_MANAGEMENT_URL: "http://13.48.18.145",
    // BASE_URL: "http://16.16.202.195:9999",
    // PMS_BASE_URL: "http://13.127.14.175",
    // MSOffice_USER_MANAGEMENT_URL: "http://13.48.18.145",
    // EMPLOYEE_ONBOARDING_URL: "http://16.16.202.195:9999" 
    // }
    //
    // Tip: use one secret per environment (runtime-dev, runtime-staging, runtime-prod).
    // The pipeline picks the right one based on branch name via loadEnv().
    envSecret      : 'intranet/frontend/runtime-dev',

    s3Bucket       : 'paves-intranet-testing-dev',
    cloudfrontId   : 'E1QTJRU34QZ161',

    // ── Optional ──────────────────────────────────────────────────────────────
    cloudfrontDomain: 'd15j2ej3bear0q.cloudfront.net',
    sonarProjectKey : 'intranet-frontend',
    nodeVersion     : 'NodeJS-20',
    awsRegion       : 'ap-south-1',
    buildDir        : 'dist',
])