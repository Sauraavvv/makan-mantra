"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { AccountSidebar } from "@/components/site/account-sidebar";
import { type SessionUser } from "@/context/session-context";

/**
 * The header's way into the account panel.
 *
 * Three lines rather than the profile photo: the panel behind it is a menu —
 * activity, tools, the way out — and a face on the button promised a profile
 * page instead. The photo still leads the panel itself, where it labels whose
 * account this is.
 */
export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open account menu for ${user.name || user.email}`}
        /* Inherits its colour: the same button sits on the navy header and,
           on a phone, inside the light menu sheet — a fixed white would
           disappear on the second. */
        className="grid size-9 shrink-0 place-items-center rounded-lg text-current transition-colors hover:bg-current/10"
      >
        <Menu className="size-5" strokeWidth={2} />
      </button>

      <AccountSidebar user={user} open={open} onOpenChange={setOpen} />
    </>
  );
}
