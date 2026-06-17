from locust import HttpUser, task, between


class VeritasUser(HttpUser):
    wait_time = between(1, 3)

    @task(4)
    def transactions(self):
        self.client.get("/transactions")

    @task(2)
    def frauds(self):
        self.client.get("/frauds")

    @task(2)
    def high_risk(self):
        self.client.get("/high-risk")

    @task(1)
    def stats(self):
        self.client.get("/stats")

    @task(1)
    def health(self):
        self.client.get("/")
