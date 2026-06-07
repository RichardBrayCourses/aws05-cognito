import { useEffect, useState } from "react";
import {
  checkAdministratorMembership,
  checkApiServerHealth,
} from "@/services/apiServer";
import { useAuth } from "@/context/AuthContext";

const Footer = () => {
  const { isLoggedIn } = useAuth();
  const [apiServerIsHealthy, setApiServerIsHealthy] = useState<boolean | null>(
    null,
  );
  const [isAdministrator, setIsAdministrator] = useState(false);

  useEffect(() => {
    const checkServices = async () => {
      try {
        const isHealthy = await checkApiServerHealth();
        setApiServerIsHealthy(isHealthy);

        if (!isLoggedIn) {
          setIsAdministrator(false);
          return;
        }

        const administrator = await checkAdministratorMembership();
        setIsAdministrator(administrator);
      } catch {
        setApiServerIsHealthy(false);
        setIsAdministrator(false);
      }
    };

    void checkServices();
  }, [isLoggedIn]);

  const servicesStatus =
    apiServerIsHealthy === null
      ? "services: checking"
      : apiServerIsHealthy
        ? "services: ok"
        : "services: api server down";

  return (
    <footer className="border-t px-4 py-1.5">
      <div className="mx-auto flex max-w-5xl justify-end gap-4">
        {isAdministrator && <span>administrator</span>}
        <span>{servicesStatus}</span>
      </div>
    </footer>
  );
};

export default Footer;
