import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: 获取发布列表（含搜索）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'community';
    const keyword = searchParams.get('keyword') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = '';
    let countQuery = '';
    const params: any[] = [];
    const countParams: any[] = [];

    if (type === 'community') {
      query = `SELECT c.id, c.name, c.summary, c.description, c.owner_id, c.status, c.member_count,
                      c.created_at, c.category, c.industry, c.cover_image as coverImage,
                      c.is_public as isPublic, c.is_paid as isPaid, c.qr_code as qrCode,
                      c.max_members as maxMembers, c.rules, c.images,
                      c.is_pinned as is_pinned, c.sort_order as sort_order,
                      u.display_name as owner_name
               FROM communities c LEFT JOIN users u ON c.owner_id = u.id
               WHERE 1=1`;
      countQuery = `SELECT COUNT(*) as total FROM communities c WHERE 1=1`;
      if (keyword) {
        query += ` AND (c.name LIKE ? OR c.summary LIKE ?)`;
        countQuery += ` AND (c.name LIKE ? OR c.summary LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`);
        countParams.push(`%${keyword}%`, `%${keyword}%`);
      }
      query += ` ORDER BY c.is_pinned DESC, c.sort_order ASC, c.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    } else if (type === 'activity') {
      query = `SELECT a.id, a.title as name, a.description as summary, a.user_id as owner_id, a.status,
                      a.max_participants, a.start_time, a.created_at,
                      a.is_pinned as is_pinned, a.sort_order as sort_order,
                      u.display_name as owner_name
               FROM activities a LEFT JOIN users u ON a.user_id = u.id
               WHERE 1=1`;
      countQuery = `SELECT COUNT(*) as total FROM activities a WHERE 1=1`;
      if (keyword) {
        query += ` AND (a.title LIKE ? OR a.description LIKE ?)`;
        countQuery += ` AND (a.title LIKE ? OR a.description LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`);
        countParams.push(`%${keyword}%`, `%${keyword}%`);
      }
      query += ` ORDER BY a.is_pinned DESC, a.sort_order ASC, a.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    } else if (type === 'project') {
      query = `SELECT p.id, p.title as name, p.summary, p.description, p.industry, p.location, p.types, p.images, p.qr_code as qrCode, p.user_id as owner_id, p.status,
                      p.created_at,
                      p.is_pinned as is_pinned, p.sort_order as sort_order,
                      u.display_name as owner_name
               FROM projects p LEFT JOIN users u ON p.user_id = u.id
               WHERE 1=1`;
      countQuery = `SELECT COUNT(*) as total FROM projects p WHERE 1=1`;
      if (keyword) {
        query += ` AND (p.title LIKE ? OR p.description LIKE ?)`;
        countQuery += ` AND (p.title LIKE ? OR p.description LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`);
        countParams.push(`%${keyword}%`, `%${keyword}%`);
      }
      query += ` ORDER BY p.is_pinned DESC, p.sort_order ASC, p.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const [rows]: any = await pool.query(query, params);
    const [countResult]: any = await pool.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    // 项目类型：从 images JSON 中提取 coverImage
    if (type === 'project') {
      rows.forEach((r: any) => {
        try {
          const images = typeof r.images === 'string' ? JSON.parse(r.images) : (r.images || []);
          r.coverImage = Array.isArray(images) && images.length > 0 ? images[0] : '';
        } catch {
          r.coverImage = '';
        }
      });
    }

    return NextResponse.json({
      success: true,
      items: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取发布列表失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// PUT: 审核通过 / 置顶切换
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, action } = body;

    if (!id || !type || !action) {
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 });
    }

    let table = '';
    if (type === 'community') table = 'communities';
    else if (type === 'activity') table = 'activities';
    else if (type === 'project') table = 'projects';
    else return NextResponse.json({ success: false, error: '类型错误' }, { status: 400 });

    if (action === 'approve') {
      // 审核通过：状态改为 active
      await pool.query(`UPDATE ${table} SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: '已审核通过' });
    } else if (action === 'reject') {
      // 驳回：状态改为 rejected
      await pool.query(`UPDATE ${table} SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: '已驳回' });
    } else if (action === 'pin') {
      // 置顶：接受客户端传入的 sortOrder（1-10），为空时自动分配
      const sortOrder = body.sortOrder;
      
      // 检查当前置顶数量（最多10个）
      const [pinned]: any = await pool.query(
        `SELECT COUNT(*) as count FROM ${table} WHERE is_pinned = 1`
      );
      const pinnedCount = pinned[0]?.count || 0;
      
      let targetOrder = sortOrder;
      
      if (targetOrder) {
        // 用户指定了序号：把>=该序号的现有置顶后移
        await pool.query(
          `UPDATE ${table} SET sort_order = sort_order + 1 WHERE is_pinned = 1 AND sort_order >= ? AND id != ?`,
          [targetOrder, id]
        );
      } else {
        // 未指定序号：放在最后
        if (pinnedCount >= 10) {
          return NextResponse.json({ success: false, error: '置顶项目已达上限（最多10个）' }, { status: 400 });
        }
        const [maxOrder]: any = await pool.query(
          `SELECT MAX(sort_order) as maxOrder FROM ${table} WHERE is_pinned = 1`
        );
        targetOrder = (maxOrder[0]?.maxOrder || 0) + 1;
      }
      
      await pool.query(
        `UPDATE ${table} SET is_pinned = 1, sort_order = ? WHERE id = ?`,
        [targetOrder, id]
      );
      return NextResponse.json({ success: true, message: '已置顶，序号: ' + targetOrder });
    } else if (action === 'unpin') {
      // 取消置顶
      const sortOrderVal = body.sortOrder || body.sort_order;
      if (sortOrderVal) {
        // 将该序号之后的置顶项前移
        await pool.query(
          `UPDATE ${table} SET sort_order = sort_order - 1 WHERE is_pinned = 1 AND sort_order > ?`,
          [sortOrderVal]
        );
      }
      await pool.query(
        `UPDATE ${table} SET is_pinned = 0, sort_order = 0 WHERE id = ?`,
        [id]
      );
      return NextResponse.json({ success: true, message: '已取消置顶' });
    } else if (action === 'moveUp') {
      const sortOrderVal = body.sortOrder || body.sort_order;
      if (!sortOrderVal) return NextResponse.json({ success: false, error: '缺少序号' }, { status: 400 });
      const aboveOrder = sortOrderVal - 1;
      if (aboveOrder < 1) return NextResponse.json({ success: false, error: '已是最顶部' }, { status: 400 });
      const [above]: any = await pool.query(
        `SELECT id FROM ${table} WHERE is_pinned = 1 AND sort_order = ?`,
        [aboveOrder]
      );
      if (above.length > 0) {
        await pool.query(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [aboveOrder, id]);
        await pool.query(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [sortOrderVal, above[0].id]);
      }
      return NextResponse.json({ success: true });
    } else if (action === 'moveDown') {
      const sortOrderVal = body.sortOrder || body.sort_order;
      if (!sortOrderVal) return NextResponse.json({ success: false, error: '缺少序号' }, { status: 400 });
      const belowOrder = sortOrderVal + 1;
      const [below]: any = await pool.query(
        `SELECT id FROM ${table} WHERE is_pinned = 1 AND sort_order = ?`,
        [belowOrder]
      );
      if (below.length > 0) {
        await pool.query(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [belowOrder, id]);
        await pool.query(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [sortOrderVal, below[0].id]);
      }
      return NextResponse.json({ success: true });
    } else if (action === 'edit') {
      // 编辑内容（直接更新数据库，无需检查用户权限）
      const { name, summary, description, category, industry, coverImage, qrCode,
              isPublic, isPaid, maxMembers, rules, images, location, max_participants,
              start_time, types, price } = body;
      const fields: string[] = [];
      const values: any[] = [];

      if (type === 'community') {
        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (summary !== undefined) { fields.push('summary = ?'); values.push(summary); }
        if (description !== undefined) { fields.push('description = ?'); values.push(description); }
        if (category !== undefined) { fields.push('category = ?'); values.push(category); }
        if (industry !== undefined) { fields.push('industry = ?'); values.push(industry); }
        if (coverImage !== undefined) { fields.push('cover_image = ?'); values.push(coverImage); }
        if (qrCode !== undefined) { fields.push('qr_code = ?'); values.push(qrCode); }
        if (isPublic !== undefined) { fields.push('is_public = ?'); values.push(isPublic ? 1 : 0); }
        if (isPaid !== undefined) { fields.push('is_paid = ?'); values.push(isPaid ? 1 : 0); }
        if (maxMembers !== undefined) { fields.push('max_members = ?'); values.push(maxMembers); }
        if (rules !== undefined) { fields.push('rules = ?'); values.push(rules); }
        if (images !== undefined) { fields.push('images = ?'); values.push(typeof images === 'string' ? images : JSON.stringify(images)); }
      } else if (type === 'activity') {
        if (name !== undefined) { fields.push('title = ?'); values.push(name); }
        if (description !== undefined) { fields.push('description = ?'); values.push(description); }
        if (location !== undefined) { fields.push('location = ?'); values.push(location); }
        if (max_participants !== undefined) { fields.push('max_participants = ?'); values.push(max_participants); }
        if (coverImage !== undefined) { fields.push('cover_image = ?'); values.push(coverImage); }
        if (qrCode !== undefined) { fields.push('qr_code = ?'); values.push(qrCode); }
        if (isPaid !== undefined) { fields.push('is_paid = ?'); values.push(isPaid ? 1 : 0); }
        if (price !== undefined) { fields.push('price = ?'); values.push(price); }
      } else if (type === 'project') {
        if (name !== undefined) { fields.push('title = ?'); values.push(name); }
        if (summary !== undefined) { fields.push('summary = ?'); values.push(summary); }
        if (description !== undefined) { fields.push('description = ?'); values.push(description); }
        if (location !== undefined) { fields.push('location = ?'); values.push(location); }
        if (industry !== undefined) { fields.push('industry = ?'); values.push(industry); }
        if (types !== undefined) { fields.push('types = ?'); values.push(typeof types === 'string' ? types : JSON.stringify(types)); }
        if (coverImage !== undefined) { fields.push('images = ?'); values.push(JSON.stringify([coverImage])); }
        if (qrCode !== undefined) { fields.push('qr_code = ?'); values.push(qrCode); }
      }

      if (fields.length === 0) {
        return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await pool.query(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`, values);
      return NextResponse.json({ success: true, message: '已保存' });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    console.error('操作失败:', error?.message || error);
    // 如果 is_pinned/sort_order 列不存在，返回友好提示
    if (error?.message?.includes('Unknown column')) {
      return NextResponse.json({
        success: false,
        error: '数据库缺少排序字段，请在管理后台执行数据库迁移后使用此功能'
      }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: error?.message || '操作失败' }, { status: 500 });
  }
}

// DELETE: 删除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 });
    }

    let table = '';
    if (type === 'community') table = 'communities';
    else if (type === 'activity') table = 'activities';
    else if (type === 'project') table = 'projects';
    else return NextResponse.json({ success: false, error: '类型错误' }, { status: 400 });

    await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('删除失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
