from setuptools import find_namespace_packages, setup

setup(
    name="ckanext-wajo-theme",
    version="0.1.0",
    description="Custom CKAN admin theme for Portal Satu Data Kabupaten Wajo",
    packages=find_namespace_packages(include=["ckanext.wajo_theme", "ckanext.wajo_theme.*"]),
    include_package_data=True,
    package_data={
        "ckanext.wajo_theme": [
            "templates/*.html",
            "assets/webassets.yml",
            "assets/css/*.css",
            "public/*",
        ],
    },
    zip_safe=False,
    entry_points={
        "ckan.plugins": ["wajo_theme = ckanext.wajo_theme.plugin:WajoThemePlugin"],
    },
)
