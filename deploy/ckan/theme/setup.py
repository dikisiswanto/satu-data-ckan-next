from setuptools import find_namespace_packages, setup

setup(
    name="ckanext-portal-theme",
    version="0.2.0",
    description="Reusable, institution-independent CKAN portal theme and editorial integration",
    packages=find_namespace_packages(include=["ckanext.portal_theme", "ckanext.portal_theme.*"]),
    include_package_data=True,
    package_data={
        "ckanext.portal_theme": [
            "config_declaration.yaml",
            "templates/*.html",
            "templates/ckanext_pages/*.html",
            "templates/scheming/display_snippets/*.html",
            "templates/portal_theme/*.html",
            "assets/webassets.yml",
            "assets/css/*.css",
            "schemas/*.yaml",
            "public/*",
            "i18n/id/LC_MESSAGES/*.po",
        ],
    },
    zip_safe=False,
    entry_points={
        "ckan.plugins": [
            "portal_pages = ckanext.portal_theme.plugin:PortalPagesSchemaPlugin",
            "portal_theme = ckanext.portal_theme.plugin:PortalThemePlugin",
            "portal_harvest_i18n = ckanext.portal_theme.plugin:PortalHarvestTranslationPlugin",
            "portal_pages_i18n = ckanext.portal_theme.plugin:PortalPagesTranslationPlugin",
            "portal_dcat_i18n = ckanext.portal_theme.plugin:PortalDcatTranslationPlugin",
        ],
    },
)
