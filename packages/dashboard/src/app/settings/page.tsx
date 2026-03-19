"use client";

import { useState } from "react";
import {
  MapPin,
  Clock,
  ShieldOff,
  Users,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

type SettingsTab = "territories" | "crawlers" | "suppression" | "users";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "territories", label: "Territories", icon: MapPin },
  { id: "crawlers", label: "Crawler Schedules", icon: Clock },
  { id: "suppression", label: "Suppression Lists", icon: ShieldOff },
  { id: "users", label: "User Management", icon: Users },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("territories");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted">
          Configure territories, crawlers, and system preferences
        </p>
      </div>

      <div className="flex gap-2 border-b border-border pb-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === id
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "territories" && <TerritoriesSettings />}
      {activeTab === "crawlers" && <CrawlerSettings />}
      {activeTab === "suppression" && <SuppressionSettings />}
      {activeTab === "users" && <UserSettings />}
    </div>
  );
}

function TerritoriesSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          Territory Configuration
        </h3>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-light">
          <Plus className="h-4 w-4" /> Add Territory
        </button>
      </div>
      {["Northeast", "Southeast", "Midwest", "West Coast", "Southwest"].map(
        (territory) => (
          <div
            key={territory}
            className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4"
          >
            <div>
              <p className="font-medium text-text-primary">{territory}</p>
              <p className="text-sm text-text-muted">
                12 zip codes, 3 assigned reps
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-overlay">
                Edit
              </button>
              <button className="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger hover:bg-danger/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function CrawlerSettings() {
  const crawlers = [
    { name: "County Records", schedule: "Every 6 hours", status: "active", lastRun: "2 hours ago" },
    { name: "Business Filings", schedule: "Daily at 2:00 AM", status: "active", lastRun: "14 hours ago" },
    { name: "Real Estate Listings", schedule: "Every 4 hours", status: "active", lastRun: "1 hour ago" },
    { name: "Court Records", schedule: "Daily at 3:00 AM", status: "paused", lastRun: "2 days ago" },
    { name: "Social Media", schedule: "Every 12 hours", status: "active", lastRun: "5 hours ago" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">
        Crawler Schedules
      </h3>
      {crawlers.map((crawler) => (
        <div
          key={crawler.name}
          className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4"
        >
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                "h-2.5 w-2.5 rounded-full",
                crawler.status === "active" ? "bg-success" : "bg-text-muted"
              )}
            />
            <div>
              <p className="font-medium text-text-primary">{crawler.name}</p>
              <p className="text-sm text-text-muted">{crawler.schedule}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-muted">
              Last run: {crawler.lastRun}
            </span>
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-overlay">
              {crawler.status === "active" ? "Pause" : "Resume"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SuppressionSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          Suppression Lists
        </h3>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-light">
          <Plus className="h-4 w-4" /> Upload List
        </button>
      </div>
      <div className="rounded-xl border border-border bg-surface-raised p-5">
        <p className="text-sm text-text-secondary">
          Suppressed contacts will not receive outreach or appear in lead
          queues. Upload a CSV with email addresses or phone numbers.
        </p>
        <div className="mt-4 space-y-2">
          {[
            { name: "Do Not Call Registry", count: 12450, updated: "Mar 15, 2026" },
            { name: "Client Opt-Outs", count: 342, updated: "Mar 18, 2026" },
            { name: "Compliance Blocklist", count: 89, updated: "Mar 10, 2026" },
          ].map((list) => (
            <div
              key={list.name}
              className="flex items-center justify-between rounded-lg bg-surface-overlay px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {list.name}
                </p>
                <p className="text-xs text-text-muted">
                  {list.count.toLocaleString()} entries &middot; Updated{" "}
                  {list.updated}
                </p>
              </div>
              <button className="text-sm text-danger hover:text-danger-light">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserSettings() {
  const users = [
    { name: "Jane Doe", email: "jane@meridian.io", role: "Admin", status: "active" },
    { name: "Marcus Chen", email: "marcus@meridian.io", role: "Advisor", status: "active" },
    { name: "Lisa Park", email: "lisa@meridian.io", role: "Advisor", status: "active" },
    { name: "Tom Wilson", email: "tom@meridian.io", role: "Viewer", status: "invited" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          User Management
        </h3>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-light">
          <Plus className="h-4 w-4" /> Invite User
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-left text-text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className="border-b border-border">
                <td className="px-4 py-3 font-medium text-text-primary">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 text-xs",
                      user.status === "active"
                        ? "text-success"
                        : "text-amber-400"
                    )}
                  >
                    <span
                      className={clsx(
                        "h-1.5 w-1.5 rounded-full",
                        user.status === "active"
                          ? "bg-success"
                          : "bg-amber-400"
                      )}
                    />
                    {user.status === "active" ? "Active" : "Invited"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-sm text-text-secondary hover:text-text-primary">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
