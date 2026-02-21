"""add_impressions_to_analytics

Revision ID: 11b52768da80
Revises: 4df817618573
Create Date: 2026-02-22 02:26:54.078121

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '11b52768da80'
down_revision: Union[str, None] = '4df817618573'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('analytics_snapshots', sa.Column('impressions', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('analytics_snapshots', 'impressions')
    # ### end Alembic commands ###
