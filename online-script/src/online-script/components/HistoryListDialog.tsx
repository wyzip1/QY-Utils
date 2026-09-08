import React, { useEffect, useState } from "react";
import { Modal, Button, Popconfirm, Pagination, Empty } from "antd";
import { HeartFilled, HeartOutlined } from "@ant-design/icons";
import styled from "styled-components";

const HistoryListDialogStyled = styled.div``;
const HistoryStyled = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 55px;
  border-top: 1px solid var(--color-border);
  transition: all 0.3s;

  &:hover {
    background-color: var(--color-border);
  }

  &:hover .control > .btns {
    display: flex;
  }

  &:last-child {
    border-bottom: 1px solid var(--color-border);
  }

  & > .content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  & > .control {
    display: flex;
    & > .btns {
      display: none;
      align-items: center;
      & > * {
        width: 40px;
        padding: unset;
      }
    }
    & > .favorite {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 40px;
      color: #155bd4;
      cursor: pointer;
    }
  }
`;

interface HistoryListDialogProps {
  open?: boolean;
  onClose?(): void;
  selectHistory?(value: string): void;
}

export interface HistoryData {
  id: string;
  isFavorite: boolean;
  value: string;
}

interface HistoryProps {
  id: string;
  isFavorite: boolean;
  value: string;
  applyCode?(value: string): void;
  update(): void;
}

export function getHistoryList(): Array<HistoryData> {
  return JSON.parse(localStorage.getItem("history_list") || "[]");
}

export function saveHistoryList(historyList: Array<HistoryData>): void {
  historyList.sort((a, b) => +b.isFavorite - +a.isFavorite);
  localStorage.setItem("history_list", JSON.stringify(historyList));
}

const History = ({ id, isFavorite, value, update, applyCode }: HistoryProps) => {
  function toggleFavorite() {
    const historyList = getHistoryList();
    const history = historyList.find(history => history.id === id);
    if (!history) return;
    history.isFavorite = !isFavorite;
    saveHistoryList(historyList);
    update();
  }

  function deleteHistory() {
    const historyList = getHistoryList();
    const historyIdx = historyList.findIndex(history => history.id === id);
    if (historyIdx === -1) return;
    historyList.splice(historyIdx, 1);
    saveHistoryList(historyList);
    update();
  }

  return (
    <HistoryStyled>
      <div className="content">{value}</div>
      <div className="control">
        {isFavorite ? (
          <HeartFilled className="favorite" onClick={toggleFavorite} />
        ) : (
          <HeartOutlined className="favorite" onClick={toggleFavorite} />
        )}
        <div className="btns">
          <Popconfirm title="确认覆盖当前内容？" onConfirm={() => applyCode?.(value)}>
            <Button type="link">应用</Button>
          </Popconfirm>
          <Popconfirm title="确认删除当前记录？" onConfirm={deleteHistory}>
            <Button type="link">删除</Button>
          </Popconfirm>
        </div>
      </div>
    </HistoryStyled>
  );
};

export default function HistoryListDialog({
  open,
  onClose,
  selectHistory,
}: HistoryListDialogProps) {
  const [historyList, setHistoryList] = useState<Array<HistoryData>>([]);
  const [page, setPage] = useState(1);

  function closeHistoryList() {
    setHistoryList([]);
  }

  function initHistoryList() {
    const historyList = getHistoryList();

    setHistoryList(historyList);
  }

  useEffect(() => {
    if (open) initHistoryList();
    else closeHistoryList();
  }, [open]);

  return (
    <Modal title="执行历史记录" open={open} onCancel={onClose} footer={<></>}>
      <HistoryListDialogStyled>
        {historyList.slice((page - 1) * 10, page * 10).map(history => (
          <History
            key={history.id}
            {...history}
            update={initHistoryList}
            applyCode={value => {
              onClose?.();
              selectHistory?.(value);
            }}
          />
        ))}
        {historyList.length === 0 && <Empty />}

        <div className="flex justify-end mt-2">
          <Pagination
            current={page}
            onChange={page => setPage(page)}
            pageSize={10}
            total={historyList.length}
            showTotal={total => `共 ${total} 条`}
          />
        </div>
      </HistoryListDialogStyled>
    </Modal>
  );
}
