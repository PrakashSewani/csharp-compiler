FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /sandbox

# Pre-create a console app template to speed up builds
RUN dotnet new console -n template --force && rm -rf template

CMD ["dotnet", "run"]
