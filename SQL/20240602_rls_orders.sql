/* Migration: Enable RLS on orders and order_items */

-- Enable row level security on orders table
alter table public.orders enable row level security;

-- Policy to allow users to access their own orders (select, insert, update, delete)
create policy "owner_orders" on public.orders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable row level security on order_items table
alter table public.order_items enable row level security;

-- Policy to allow users to access order items belonging to their orders
create policy "owner_order_items" on public.order_items
  for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and auth.uid() = o.user_id
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and auth.uid() = o.user_id
    )
  );
