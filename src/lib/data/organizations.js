import "server-only";
import { cache } from "react";
import { ckanAction } from "@/lib/ckan/client";

export async function getPublicOrganizationsResult() {
  try {
    const result = await ckanAction("organization_list", {
      all_fields: true,
      include_dataset_count: true,
      include_datasets: false,
      include_extras: false,
      include_users: false,
    });
    const organizations = (Array.isArray(result) ? result : [])
      .filter((organization) => organization.state !== "deleted");
    return { data: organizations, unavailable: false };
  } catch (error) {
    console.error("ckan_organization_list_failed", { status: error?.status || null });
    return { data: [], unavailable: true };
  }
}
export async function getPublicOrganizations() {
  return (await getPublicOrganizationsResult()).data;
}
export const getPublicOrganizationBySlugResult = cache(async function getOrganizationByName(name) {
  if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(name)) {
    return { data: null, unavailable: false };
  }
  try {
    const organization = await ckanAction("organization_show", {
      id: name,
      include_dataset_count: true,
      include_datasets: false,
      include_extras: false,
      include_users: false,
    });
    return {
      data: organization?.state === "deleted" ? null : organization,
      unavailable: false,
    };
  } catch (error) {
    if (error?.status === 404) return { data: null, unavailable: false };
    console.error("ckan_organization_detail_failed", { status: error?.status || null });
    return { data: null, unavailable: true };
  }
});
