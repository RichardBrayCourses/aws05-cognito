import { useEffect, useState } from "react";
import { checkApiServerHealth } from "@/services/apiServer";

const Footer = () => {
  const [apiServerIsHealthy, setApiServerIsHealthy] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const checkServices = async () => {
      try {
        const isHealthy = await checkApiServerHealth();
        setApiServerIsHealthy(isHealthy);
      } catch {
        setApiServerIsHealthy(false);
      }
    };

    void checkServices();
  }, []);

  const servicesStatus =
    apiServerIsHealthy === null
      ? "services: checking"
      : apiServerIsHealthy
        ? "services: ok"
        : "services: api server down";

  return (
    <footer className="border-t px-4 py-1.5">
      <div className="mx-auto flex max-w-5xl justify-end">{servicesStatus}</div>
    </footer>
  );
};

export default Footer;
