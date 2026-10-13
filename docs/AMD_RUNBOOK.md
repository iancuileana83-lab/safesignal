# AMD runbook (credits are limited: work fast, then stop the droplet)

Commands marked (verify) come from general knowledge and the public AMD docs; check them against the
current AMD Developer Cloud pages on the day.

## Before creating anything
1. Credits approved and visible in the AMD Developer Cloud console (billing page).
2. Model access: Gemma is gated on Hugging Face. Accept the licence on the model page with your account and
   create a read token. Type it in the droplet shell yourself; never paste it in chat or commit it.
3. Have these ready so the droplet runs as little as possible: this repo, `.env`, an SSH key.

## Create the droplet (console, by hand)
1. Create a GPU droplet with **1x MI300X** and the **vLLM Quick Start** image (verify the image name).
2. Add your SSH key. Note the public IP.
3. Firewall: port 22 and port 8000 only from your own IP. Start vLLM with `--api-key` so the endpoint is never
   open without a key.

## Serve the model (on the droplet)
```bash
docker ps                      # the quick start image runs a container, e.g. "rocm" (verify)
docker exec -it rocm /bin/bash
export HF_TOKEN=...            # type it here, do not save it in files
export SERVER_KEY=...          # any long random string you choose
vllm serve google/gemma-3-27b-it \
  --host 0.0.0.0 --port 8000 --api-key "$SERVER_KEY" \
  --max-model-len 8192         # (verify flags for the installed vLLM version)
curl localhost:8000/v1/models -H "Authorization: Bearer $SERVER_KEY"
```
If the 27B model is slow to download or does not fit, use `google/gemma-3-12b-it`.
If Gemma access is not granted yet, use an open model that needs no gate (for example a Qwen instruct model)
and say so honestly in the submission.

## Connect and measure (on your PC)
Edit `.env` yourself:
```
LLM_BASE_URL=http://<DROPLET_IP>:8000/v1
LLM_API_KEY=<the key you chose>
LLM_MODEL=google/gemma-3-27b-it
BACKEND_KIND=amd
BACKEND_LABEL=vLLM on AMD Instinct MI300X
HARDWARE_LABEL=AMD Instinct MI300X · ROCm · vLLM
```
```bash
npm start            # open http://localhost:3000, the badge must say "Live on AMD"
npm run record       # real replays into data/replays
npm run bench        # results into bench/results (JSON + Markdown)
```
Also capture from the droplet `rocm-smi` and `vllm --version` for the README (real values only).
Record the demo video in the same session so the GPU is not needed again.

## Stop paying
1. Commit `data/replays/` and `bench/results/` (real files only) and push.
2. Destroy the droplet in the console (a powered-off droplet may still bill: verify, destroy to be safe).
3. Remove the firewall rule; revoke the Hugging Face token if it was only for this.
The hosted demo then runs in replay mode with the recordings above.
