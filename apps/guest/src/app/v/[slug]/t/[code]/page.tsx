"use client";

import { use } from "react";
import { MenuExperience } from "@/components/menu-experience";

export default function TablePage({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = use(params);
  return <MenuExperience slug={slug} code={code} />;
}
