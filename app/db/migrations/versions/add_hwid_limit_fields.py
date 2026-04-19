"""Add HWID limit fields to users table

Revision ID: add_hwid_limit_fields
Revises: fe7796f840a4
Create Date: 2026-04-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_hwid_limit_fields'
down_revision = 'fe7796f840a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('hwids', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('hwid_limit', sa.BigInteger(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('hwid_limit')
        batch_op.drop_column('hwids')
