FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /work

RUN dotnet new console -n template -o /tmp/template --force && rm -rf /tmp/template

CMD ["dotnet", "--info"]
