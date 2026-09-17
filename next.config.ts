import type { NextConfig } from "next";

/**
 * A aplicação é estática de ponta a ponta: não há Route Handler nem servidor.
 * O navegador fala direto com a `api.openai.com`, que devolve CORS aberto tanto
 * no `/v1/realtime/client_secrets` quanto no `/v1/realtime/calls`. É isso que
 * permite publicar no GitHub Pages.
 *
 * `BASE_PATH` só é preenchido no workflow de deploy, porque no Pages o site
 * mora em /cardios-bot-atendimento-voz e localmente mora na raiz.
 */
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
