/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import type { User } from "../../types/user.type";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import { createFilterQueryFromArray, formatter } from "../../utils/utils";
import { Col, Row, Space, Tag, Flex } from "antd";
import Delete from "../../components/Delete";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";
import {
  OPTIONS_LOAI_PHIEU_CHI,
  OPTIONS_PHUONG_THUC_THANH_TOAN,
  OPTIONS_STATUS,
} from "../../utils/constant";
import dayjs from "dayjs";
import ChiTietPhieuChi from "./ChiTietPhieuChi";
import { checkIsToday } from "../../helpers/funcHelper";
import axios from "../../configs/axios";
import { API_ROUTE_CONFIG } from "../../configs/api-route-config";

import { postPhieuChi, unpostPhieuChi } from "../../services/phieuChi.api";
import { Button, Popconfirm, message } from "antd";



type ApiResp<T> = { success: boolean; data: T };


type ExpenseTreeNode = {
  id: number;
  code: string;
  name: string;
  statement_line?: number | null;
  children?: Array<{
    id: number;
    code: string;
    name: string;
    statement_line?: number | null;
  }>;
};

const DanhSachPhieuChi = ({
  path,
  permission,
  title,
}: {
  path: string;
  permission: Actions;
  title: string;
}) => {
  const dispatch = useDispatch();

  const isReload = useSelector((state: RootState) => state.main.isReload);

  const [danhSach, setDanhSach] = useState<
    { data: User[]; total: number } | undefined
  >({ data: [], total: 0 });
  const { filter, handlePageChange, handleLimitChange } = usePagination({
    page: 1,
    limit: 20,
  });
  const {
    inputSearch,
    query,
    dateSearch,
    selectSearch,
    selectSearchWithOutApi,
  } = useColumnSearch();
  const [isLoading, setIsLoading] = useState(false);

  const [postingId, setPostingId] = useState<number | null>(null);
const [unpostingId, setUnpostingId] = useState<number | null>(null);

const doPost = async (id: number) => {
  setPostingId(id);
  try {
    await postPhieuChi(id);
    message.success("Đã ghi sổ phiếu chi");
    await getDanhSach();
  } catch (e: any) {
    message.error(e?.response?.data?.message || e?.message || "Không thể ghi sổ");
  } finally {
    setPostingId(null);
  }
};

const doUnpost = async (id: number) => {
  setUnpostingId(id);
  try {
    await unpostPhieuChi(id);
    message.success("Đã hủy ghi sổ phiếu chi");
    await getDanhSach();
  } catch (e: any) {
    message.error(e?.response?.data?.message || e?.message || "Không thể hủy ghi sổ");
  } finally {
    setUnpostingId(null);
  }
};


  // ===== NEW: Cache danh mục chi (tree) để render tên theo category_id =====
  const [categoryMap, setCategoryMap] = useState<
    Map<number, { name: string; code: string; parentName: string; parentCode: string }>
  >(new Map());
  const [categoryOptions, setCategoryOptions] = useState<
    Array<{ label: string; value: number }>
  >([]);

  const fetchExpenseCategoryTree = async () => {
    // Không có constant cho /tree, gọi trực tiếp là ổn
    const res = (await axios.get("/expense-categories/tree")) as ApiResp<ExpenseTreeNode[]>;
if (!res.success) return;
const tree: ExpenseTreeNode[] = res.data ?? [];
    const map = new Map<number, { name: string; code: string; parentName: string; parentCode: string }>();
    const opts: Array<{ label: string; value: number }> = [];

    tree.forEach((p) => {
      (p.children || []).forEach((c) => {
        map.set(c.id, {
          name: c.name,
          code: c.code,
          parentName: p.name,
          parentCode: p.code,
        });
        opts.push({ label: `${p.name} / ${c.name}`, value: c.id });
      });
    });

    setCategoryMap(map);
    setCategoryOptions(opts.sort((a, b) => a.label.localeCompare(b.label)));
  };

  const getDanhSach = async () => {
    setIsLoading(true);
    const params = { ...filter, ...createFilterQueryFromArray(query) };
    const ds = await getListData(path, params);
    if (ds) setIsLoading(false);
    setDanhSach(ds);
  };

  useEffect(() => {
    fetchExpenseCategoryTree(); // load 1 lần cho render tên danh mục
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getDanhSach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReload, filter, query]);

  const defaultColumns: any = [
    {
      title: "STT",
      dataIndex: "index",
      width: 60,
      render: (_text: any, _record: any, index: any) => {
        return filter.limit && (filter.page - 1) * filter.limit + index + 1;
      },
    },
    {
  title: "Thao tác",
  dataIndex: "id",
   width: 170,
  align: "center",
  render: (id: number, record: any) => {
    const canPost   = (permission.edit || permission.create) && Number(record?.has_ledger) === 0;
    const canUnpost = (permission.edit || permission.create) && Number(record?.has_ledger) > 0;

    return (
      <Space size={6}>
        {/* Nút XEM: chỉ khóa form, không có nút Lưu */}
        {permission.show && (
          <ChiTietPhieuChi
            path={path}
            id={id}
            title={title}
            editable={false}
          />
        )}

        {/* Nút SỬA: mở form, có nút Lưu (PUT) */}
        {permission.edit && (
          <ChiTietPhieuChi
            path={path}
            id={id}
            title={title}
            editable={true}
          />
        )}

        {/* ====== Ghi sổ / Hủy ghi sổ (dựa theo has_ledger) ====== */}
        {canPost && (
          <Button
            type="primary"
            size="small"
            loading={postingId === id}
            onClick={() => doPost(id)}
          >
            Ghi sổ
          </Button>
        )}

        {canUnpost && (
          <Popconfirm
            title="Hủy ghi sổ phiếu chi này?"
            okText="Hủy ghi sổ"
            cancelText="Đóng"
            onConfirm={() => doUnpost(id)}
          >
            <Button danger size="small" loading={unpostingId === id}>
              Hủy ghi sổ
            </Button>
          </Popconfirm>
        )}

        {/* Nút XOÁ giữ nguyên điều kiện hiện có */}
        {permission.delete && checkIsToday(record?.created_at || "") && (
          <Delete path={path} id={id} onShow={getDanhSach} />
        )}
      </Space>
    );
  },
},


    {
      title: "Mã phiếu chi",
      dataIndex: "ma_phieu_chi",
      ...inputSearch({
        dataIndex: "ma_phieu_chi",
        operator: "contain",
        nameColumn: "Mã phiếu chi",
      }),
    },
    {
      title: "Ngày chi",
      dataIndex: "ngay_chi",
       width: 120,  
      ...dateSearch({ dataIndex: "ngay_chi", nameColumn: "Ngày chi" }),
      render: (record: string): string => {
        const date = dayjs(record);
        return date.format("DD/MM/YYYY") || "";
      },
    },
    {
      title: "Loại phiếu chi",
      dataIndex: "loai_phieu_chi",
       width: 150,    
      render: (loai_phieu_chi: number) => {
        return OPTIONS_LOAI_PHIEU_CHI.find(
          (item: any) => item.value === loai_phieu_chi
        )?.label;
      },
      ...selectSearchWithOutApi({
        dataIndex: "loai_phieu_chi",
        operator: "equal",
        nameColumn: "Loại phiếu chi",
        options: OPTIONS_LOAI_PHIEU_CHI,
      }),
    },

    // ========= NEW: Cột Danh mục chi =========
    {
      title: "Danh mục chi",
      dataIndex: "category_id",
       width: 200,                // ⬅️ cố định
  ellipsis: true,            // ⬅️ bật ellipsis
      render: (category_id?: number) => {
        if (!category_id) return <Tag color="default">Chưa phân loại</Tag>;
        const info = categoryMap.get(Number(category_id));
        if (!info) return <Tag color="default"># {category_id}</Tag>;
        return (
          <Space size={4} wrap>
            <Tag color="blue">{info.parentName}</Tag>
            <Tag color="geekblue">{info.name}</Tag>
          </Space>
        );
      },
      // Filter equal theo category_id (dùng options từ tree)
      ...selectSearchWithOutApi({
        dataIndex: "category_id",
        operator: "equal",
        nameColumn: "Danh mục chi",
        options: categoryOptions,
      }),
    },
    // =========================================

    {
      title: "Số tiền chi",
      dataIndex: "so_tien",
       width: 120,                         // ⬅️ cố định độ rộng
  align: "right",                     // ⬅️ canh phải
      render: (so_tien: number) => {
        return (formatter(so_tien) || 0) + " đ";
      },
    },
    {
      title: "Người nhận",
      dataIndex: "nguoi_nhan",
      ...inputSearch({
        dataIndex: "nguoi_nhan",
        operator: "contain",
        nameColumn: "Người nhận",
      }),
    },

    // === Lý do chi (giữa Người nhận và Phương thức thanh toán) ===
    {
      title: "Lý do chi",
      dataIndex: "ly_do_chi",
      ellipsis: true,
      render: (text: string) => text || "",
      ...inputSearch({
        dataIndex: "ly_do_chi",
        operator: "contain",
        nameColumn: "Lý do chi",
      }),
    },



    {
      title: "Phương thức thanh toán",
      dataIndex: "phuong_thuc_thanh_toan",
      render: (phuong_thuc_thanh_toan: number) => {
        return OPTIONS_PHUONG_THUC_THANH_TOAN.find(
          (item: any) => item.value === phuong_thuc_thanh_toan
        )?.label;
      },
      ...selectSearchWithOutApi({
        dataIndex: "phuong_thuc_thanh_toan",
        operator: "equal",
        nameColumn: "Phương thức thanh toán",
        options: OPTIONS_PHUONG_THUC_THANH_TOAN,
      }),
    },
    {
      title: "Người tạo",
      dataIndex: "ten_nguoi_tao",
      ...inputSearch({
        dataIndex: "ten_nguoi_tao",
        operator: "contain",
        nameColumn: "Người tạo",
      }),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      ...dateSearch({ dataIndex: "created_at", nameColumn: "Ngày tạo" }),
    },
  ];

  return (
    <Row>
      <Col span={24}>
        <Flex vertical gap={10}>
          <Row
            justify="end"
            align="middle"
            style={{ marginBottom: 5, gap: 10 }}
          >
            {permission.export && (
              <ExportTableToExcel
                columns={defaultColumns}
                path={path}
                params={{}}
              />
            )}
            {/* {permission.create && <ImportExcel path={path} />} */}
          </Row>
          <CustomTable
            rowKey="id"
            dataTable={danhSach?.data}
            defaultColumns={defaultColumns}
            filter={filter}
            scroll={{ x: 1280 }}
             tableLayout="fixed"             // ⬅️ THÊM DÒNG NÀY
            handlePageChange={handlePageChange}
            handleLimitChange={handleLimitChange}
            total={danhSach?.total}
            loading={isLoading}
          />
        </Flex>
      </Col>
    </Row>
  );
};

export default DanhSachPhieuChi;
