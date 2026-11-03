export default {
  async me(ctx: any) {
    const staff = ctx.state.staff;
    ctx.body = {
      data: {
        id: staff.id,
        username: staff.username,
        email: staff.email,
        fullName: staff.fullName ?? null,
        staffRole: staff.staffRole,
        organization: {
          id: staff.organization.id,
          name: staff.organization.name,
          slug: staff.organization.slug,
        },
        branches: (staff.branches ?? []).map((branch: any) => ({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          city: branch.city ?? null,
        })),
      },
    };
  },
};
