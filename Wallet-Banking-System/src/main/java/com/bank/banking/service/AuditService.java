package com.bank.banking.service;

import com.bank.banking.model.entity.AuditLog;
import com.bank.banking.repository.AuditLogRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

	private final AuditLogRepo repo;

	public AuditService(AuditLogRepo repo) {
		this.repo = repo;
	}

	@Transactional
	public void log(UUID userId, String action, String entityType, String entityId, String details) {
		repo.save(new AuditLog(userId, action, entityType, entityId, details));
	}

	@Transactional(readOnly = true)
	public Page<Map<String, Object>> allPaged(int page, int size) {
		return repo.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size, Sort.by("createdAt").descending()))
				.map(a -> Map.<String, Object>of("id", a.getId(), "userId", a.getUserId(), "action", a.getAction(),
						"entityType", a.getEntityType(), "entityId", a.getEntityId(), "details",
						a.getDetails() == null ? "" : a.getDetails(), "createdAt", a.getCreatedAt().toString()));
	}

	@Transactional(readOnly = true)
	public List<Map<String, Object>> forUser(UUID userId) {
		return repo.findByUserIdOrderByCreatedAtDesc(userId).stream()
				.map(a -> Map.<String, Object>of("action", a.getAction(), "entityType", a.getEntityType(), "entityId",
						a.getEntityId(), "details", a.getDetails() == null ? "" : a.getDetails(), "createdAt",
						a.getCreatedAt().toString()))
				.toList();
	}

	@Transactional(readOnly = true)
	public List<Map<String, Object>> forEntity(String entityType, String entityId) {
		return repo.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId).stream()
				.map(a -> Map.<String, Object>of("userId", a.getUserId(), "action", a.getAction(), "details",
						a.getDetails() == null ? "" : a.getDetails(), "createdAt", a.getCreatedAt().toString()))
				.toList();
	}
}