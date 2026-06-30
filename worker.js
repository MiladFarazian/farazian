// Edge entry point. Enforces farazian.com as the single canonical host
// (www + the workers.dev origin 301-redirect to the apex), then serves the
// static site from the assets binding.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;

    if (host === "www.farazian.com" || host.endsWith(".workers.dev")) {
      url.hostname = "farazian.com";
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
