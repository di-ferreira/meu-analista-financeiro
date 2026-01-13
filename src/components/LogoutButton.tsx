// src/components/LogoutButton.tsx
import { logoutAction } from "@/app/actions/logout";

export function LogoutButton() {
    return (
        <form action={logoutAction}>
            <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors cursor-pointer"
            >
                Sair da conta
            </button>
        </form>
    );
}