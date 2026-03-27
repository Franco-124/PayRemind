from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"
    resend_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    lemon_squeezy_webhook_secret: str = ""
    lemon_squeezy_api_key: str = ""
    lemon_squeezy_store_id: str = ""
    lemon_squeezy_pro_variant_id: str = ""
    admin_email: str = "johan.franco@nousware.ai"

    class Config:
        env_file = ".env"


settings = Settings()
