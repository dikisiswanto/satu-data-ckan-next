from setuptools import find_namespace_packages, setup

setup(
    name="ckanext-wajo-theme",
    version="0.2.0",
    description="Custom CKAN admin theme for Portal Satu Data Kabupaten Wajo",
    packages=find_namespace_packages(include=["ckanext.wajo_theme", "ckanext.wajo_theme.*"]),
    include_package_data=True,
    package_data={
        "ckanext.wajo_theme": [
            "templates/*.html",
            "templates/ckanext_pages/*.html",
            "templates/wajo_theme/*.html",
            "assets/webassets.yml",
            "assets/css/*.css",
            "public/*",
            "i18n/id/LC_MESSAGES/*.po",
        ],
    },
    zip_safe=False,
    entry_points={
        "ckan.plugins": [
            "wajo_pages = ckanext.wajo_theme.plugin:WajoPagesSchemaPlugin",
            "wajo_theme = ckanext.wajo_theme.plugin:WajoThemePlugin",
            "wajo_harvest_i18n = ckanext.wajo_theme.plugin:WajoHarvestTranslationPlugin",
            "wajo_pages_i18n = ckanext.wajo_theme.plugin:WajoPagesTranslationPlugin",
        ],
    },
)
