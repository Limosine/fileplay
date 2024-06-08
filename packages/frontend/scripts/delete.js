// Script to clear (all) deployments on CloudFlare
// Remember to clear personal data before committing!

// Credentials
let accountId = "";
let email = "";
let key = "";

// Force to delete all non-active deployments
let force = false;

const deleteDeployments = async (force = false) => {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/fileplay/deployments`;

  const init = {
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "X-Auth-Email": email,
      "X-Auth-Key": key,
    },
  };

  const response = await fetch(endpoint, init);
  const deployments = await response.json();
  console.log(deployments);

  for (const deployment of deployments.result) {
    const result = await fetch(
      `${endpoint}/${deployment.id}${force ? "?force=true" : ""}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "X-Auth-Email": email,
          "X-Auth-Key": key,
        },
      },
    );
    console.log(await result.json());
  }
};

deleteDeployments(force);
