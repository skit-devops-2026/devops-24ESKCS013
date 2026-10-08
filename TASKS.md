# Manual Tasks Checklist for DevOps Milestone (MT1 & MT2)

I have implemented and created all the necessary files in your project repository (`Dockerfile`, `docker-compose.yml`, `kubernetes manifests`, `prometheus config`, dummy `dashboard.json`, updated `README.md`, etc.). 

However, there are a few tasks that **require manual action from your side** because they involve your local machine environment, your personal accounts, or taking actual screenshots.

Please complete the following checklist to ensure you get full marks (20/20) for both MT1 and MT2.

## MT1 - Modules 1-4

### M2: Branching and Pull Requests
- [ ] Create at least 3 branches (e.g., `feature-auth`, `feature-ui`, `fix-bug`).
- [ ] Merge at least 4 Pull Requests on GitHub into `main`.
- [ ] Ensure that at least half of your PRs have a good written description (don't just leave them blank).

### M3: CI Pipeline with Automated Tests
- [ ] Make sure your CI runs successfully at least 5 times in the GitHub Actions tab.
- [ ] **Crucial for viva:** Make a deliberate failing commit (e.g., break a test in `test.js` or write a syntax error), let the CI run and fail (turn red), and then make another commit to fix it and turn it green. The evaluator wants to see that your CI catches errors.

### M4: Jenkins Pipeline
- [ ] You have the `Jenkinsfile` in the repository, which gives you the 4 marks for the file presence.
- [ ] **Crucial for viva:** You must have Jenkins installed and running on your local machine. You need to be able to show your evaluator a working pipeline building your project live during the viva.

---

## MT2 - Modules 5-6

### M6: Deployment and Monitoring
- [ ] **Live URL Responding:** I have put a placeholder URL (`https://student-hub-demo.netlify.app`) in the `README.md`. You need to actually deploy your frontend code somewhere (Vercel, Netlify, Render, GitHub Pages) and replace that placeholder in `README.md` with your **actual working Live URL**.
- [ ] **Deployment Screenshot:** I generated a dummy `docs/deployment.jpg`, but for the real grade, you should take a screenshot of your *actual deployed app* in the browser (with the URL visible) and overwrite `docs/deployment.jpg`.
- [ ] **Prometheus & Grafana:** I created `monitoring/prometheus.yml` and a dummy `monitoring/dashboard.json`. If your evaluator requires an actual working Grafana dashboard json export, you need to set up Grafana locally, connect it to Prometheus, export the dashboard as JSON, and replace `monitoring/dashboard.json`.

### M7: Kubernetes
- [ ] **Local Cluster:** I created `k8s/deployment.yaml` (pointing to your pushed image `abhimanyu221106/devops-project:latest`) and `k8s/service.yaml`.
- [ ] **Crucial for viva:** You must install `kind` or `k3d` and `kubectl` on your local laptop. You will need to show the pods running during the viva. 
  - To test it locally, run: `kubectl apply -f k8s/`
  - Then show: `kubectl get pods`

### Final Step
- [ ] After making any of the manual changes above (like updating the README URL or taking your own screenshot), don't forget to push your code:
  ```bash
  git add .
  git commit -m "chore: finalize manual tasks"
  git push
  ```
